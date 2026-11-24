/**
 * Port for verifying the anti-bot challenge on the server (SPEC §8.2, ADR-0004, ADR-0013).
 * Adapter: lib/adapters/turnstile-verifier.ts.
 *
 * Never throws. `unavailable` means the provider could not answer (timeout, network): the
 * caller treats it as a failure (CAPTCHA_FAILED), per ADR-0013.
 */

export type CaptchaVerifyInput = {
  /** Token produced by the widget in the browser. */
  token: string;
  /** Visitor IP, if known. Sent only to the captcha provider, never stored or logged. */
  remoteIp?: string;
};

export type CaptchaVerifyResult =
  | { status: "ok" }
  /** errorCodes come from the provider (e.g. "timeout-or-duplicate") or are local checks. */
  | { status: "invalid"; errorCodes: readonly string[] }
  | { status: "unavailable"; errorCodes: readonly string[] };

export interface CaptchaVerifier {
  verify(input: CaptchaVerifyInput): Promise<CaptchaVerifyResult>;
}
