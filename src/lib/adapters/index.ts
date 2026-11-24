/**
 * Composition root for the external services (ADR-0013). Server Actions take their ports from
 * here; services receive them as parameters and never import this file.
 *
 * Lazy like getDb(): nothing is created (or required) until first use, so the build and the
 * tests work without credentials. A missing variable fails with a clear message that names
 * it, never its value.
 */
import "server-only";

import { env } from "@/lib/env";
import type { CaptchaVerifier } from "@/lib/ports/captcha-verifier";
import type { Clock } from "@/lib/ports/clock";
import type { EmailSender } from "@/lib/ports/email-sender";
import type { RateLimiter } from "@/lib/ports/rate-limiter";

import { createResendEmailSender } from "./resend-email-sender";
import { systemClock } from "./system-clock";
import { createTurnstileVerifier } from "./turnstile-verifier";
import { createUpstashRateLimiter } from "./upstash-rate-limiter";

export class AdapterConfigError extends Error {
  override readonly name = "AdapterConfigError";
}

function required<T extends Record<string, string | undefined>>(
  service: string,
  values: T,
): { [K in keyof T]: string } {
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new AdapterConfigError(
      `${service}: faltan ${missing.join(", ")}. Configuralas en .env.local (ver .env.example).`,
    );
  }
  return values as { [K in keyof T]: string };
}

let emailSender: EmailSender | undefined;
let captchaVerifier: CaptchaVerifier | undefined;
let rateLimiter: RateLimiter | undefined;

export function getEmailSender(): EmailSender {
  if (!emailSender) {
    const { RESEND_API_KEY, EMAIL_FROM } = required("Resend", {
      RESEND_API_KEY: env.RESEND_API_KEY,
      EMAIL_FROM: env.EMAIL_FROM,
    });
    emailSender = createResendEmailSender({ apiKey: RESEND_API_KEY, from: EMAIL_FROM });
  }
  return emailSender;
}

export function getCaptchaVerifier(): CaptchaVerifier {
  if (!captchaVerifier) {
    const { TURNSTILE_SECRET_KEY } = required("Turnstile", {
      TURNSTILE_SECRET_KEY: env.TURNSTILE_SECRET_KEY,
    });
    captchaVerifier = createTurnstileVerifier({
      secretKey: TURNSTILE_SECRET_KEY,
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
    });
  }
  return captchaVerifier;
}

export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = required("Upstash", {
      UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
    });
    rateLimiter = createUpstashRateLimiter({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return rateLimiter;
}

export function getClock(): Clock {
  return systemClock;
}
