/**
 * CaptchaVerifier over Cloudflare Turnstile (SPEC §8.2, ADR-0004, ADR-0013).
 *
 * Server-side validation with siteverify: the browser widget only produces a token; this
 * adapter sends it with the secret key and the visitor IP, and accepts it only if Cloudflare
 * says success AND the hostname is the site's. No SDK: it is a single POST.
 */
import "server-only";

import { z } from "zod";

import type {
  CaptchaVerifier,
  CaptchaVerifyInput,
  CaptchaVerifyResult,
} from "@/lib/ports/captcha-verifier";

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
/** Tokens are at most 2048 characters (Cloudflare docs). */
export const MAX_TOKEN_LENGTH = 2048;
/** The person is waiting for the form: do not wait longer than this. */
export const SITEVERIFY_TIMEOUT_MS = 5000;

/**
 * Official test secret keys (always pass / always fail / already spent). With them, siteverify
 * answers with hostname "example.com" whatever the real site is.
 */
export const TURNSTILE_TEST_SECRET_KEYS: readonly string[] = [
  "1x0000000000000000000000000000000AA",
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
];
export const TURNSTILE_TEST_HOSTNAME = "example.com";

/** Errors that are not the visitor's fault: our configuration or Cloudflare itself. */
const PROVIDER_ERROR_CODES = new Set([
  "missing-input-secret",
  "invalid-input-secret",
  "bad-request",
  "internal-error",
]);

const siteverifyResponseSchema = z.object({
  success: z.boolean(),
  "error-codes": z.array(z.string()).default([]),
  hostname: z.string().optional(),
});

export type TurnstileVerifierConfig = {
  secretKey: string;
  /** Hostname the token must have been issued for. */
  expectedHostname: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

export class TurnstileVerifier implements CaptchaVerifier {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly config: TurnstileVerifierConfig) {
    this.fetchFn = config.fetch ?? fetch;
    this.timeoutMs = config.timeoutMs ?? SITEVERIFY_TIMEOUT_MS;
  }

  async verify({ token, remoteIp }: CaptchaVerifyInput): Promise<CaptchaVerifyResult> {
    const response = token.trim();
    // Cheap local checks: no need to call Cloudflare for an obviously bad token.
    if (response === "") return { status: "invalid", errorCodes: ["missing-input-response"] };
    if (response.length > MAX_TOKEN_LENGTH) {
      return { status: "invalid", errorCodes: ["token-too-long"] };
    }

    const body = new URLSearchParams({ secret: this.config.secretKey, response });
    if (remoteIp) body.set("remoteip", remoteIp);

    let json: unknown;
    try {
      const res = await this.fetchFn(SITEVERIFY_URL, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) return { status: "unavailable", errorCodes: [`http-${res.status}`] };
      json = await res.json();
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      return { status: "unavailable", errorCodes: [timedOut ? "timeout" : "network-error"] };
    }

    const parsed = siteverifyResponseSchema.safeParse(json);
    if (!parsed.success) return { status: "unavailable", errorCodes: ["invalid-response"] };

    const { success, hostname } = parsed.data;
    const errorCodes = parsed.data["error-codes"];
    if (!success) {
      const providerError = errorCodes.some((code) => PROVIDER_ERROR_CODES.has(code));
      return { status: providerError ? "unavailable" : "invalid", errorCodes };
    }
    if (hostname !== this.config.expectedHostname) {
      return { status: "invalid", errorCodes: ["hostname-mismatch"] };
    }
    return { status: "ok" };
  }
}

/** Expected hostname: the site's, or example.com when using Cloudflare's test keys. */
export function expectedTurnstileHostname(secretKey: string, siteUrl: string): string {
  return TURNSTILE_TEST_SECRET_KEYS.includes(secretKey)
    ? TURNSTILE_TEST_HOSTNAME
    : new URL(siteUrl).hostname;
}

export function createTurnstileVerifier(config: {
  secretKey: string;
  siteUrl: string;
}): CaptchaVerifier {
  return new TurnstileVerifier({
    secretKey: config.secretKey,
    expectedHostname: expectedTurnstileHostname(config.secretKey, config.siteUrl),
  });
}
