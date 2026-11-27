/**
 * Composition root for the external services (ADR-0013). Server Actions take their ports from
 * here; services receive them as parameters and never import this file.
 *
 * Their variables are required by env.ts since F3-05: a missing one fails when the app starts
 * (dev, build, start), naming it. Each adapter is still created lazily, on first use.
 */
import "server-only";

import { env, vercelSystem } from "@/lib/env";
import type { CaptchaVerifier } from "@/lib/ports/captcha-verifier";
import type { Clock } from "@/lib/ports/clock";
import type { EmailSender } from "@/lib/ports/email-sender";
import type { ErrorReporter } from "@/lib/ports/error-reporter";
import type { FieldCipher } from "@/lib/ports/field-cipher";
import type { RateLimiter } from "@/lib/ports/rate-limiter";
import { parseFieldEncryptionKeys } from "@/lib/security/field-keys";

import { createAesGcmFieldCipher } from "./aes-gcm-field-cipher";
import { createResendEmailSender } from "./resend-email-sender";
import { createSentryErrorReporter } from "./sentry-error-reporter";
import { systemClock } from "./system-clock";
import { createTurnstileVerifier } from "./turnstile-verifier";
import { createUpstashRateLimiter } from "./upstash-rate-limiter";

let emailSender: EmailSender | undefined;
let captchaVerifier: CaptchaVerifier | undefined;
let rateLimiter: RateLimiter | undefined;
let fieldCipher: FieldCipher | undefined;

export function getEmailSender(): EmailSender {
  emailSender ??= createResendEmailSender({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM });
  return emailSender;
}

export function getCaptchaVerifier(): CaptchaVerifier {
  captchaVerifier ??= createTurnstileVerifier({
    secretKey: env.TURNSTILE_SECRET_KEY,
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
  });
  return captchaVerifier;
}

export function getRateLimiter(): RateLimiter {
  rateLimiter ??= createUpstashRateLimiter({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return rateLimiter;
}

export function getClock(): Clock {
  return systemClock;
}

/** AES-256-GCM of the inquiry message and the internal notes (ADR-0017). */
export function getFieldCipher(): FieldCipher {
  if (!fieldCipher) {
    // env.ts already validated the format; parsed again here to keep the keys as Buffers.
    const parsed = parseFieldEncryptionKeys(env.FIELD_ENCRYPTION_KEYS);
    if (!parsed.ok) throw new Error("FIELD_ENCRYPTION_KEYS inválida.");
    fieldCipher = createAesGcmFieldCipher(parsed.keys);
  }
  return fieldCipher;
}

/**
 * Sentry, only with SENTRY_DSN (ADR-0018); null without it: errors stay in Vercel's logs.
 * Created once per server instance by error-reporting.ts.
 */
export function getErrorReporter(): ErrorReporter | null {
  if (!env.SENTRY_DSN) return null;
  return createSentryErrorReporter({
    dsn: env.SENTRY_DSN,
    environment: vercelSystem.VERCEL_ENV ?? "development",
    release: vercelSystem.VERCEL_GIT_COMMIT_SHA,
  });
}
