/**
 * Composition root for the external services (ADR-0013). Server Actions take their ports from
 * here; services receive them as parameters and never import this file.
 *
 * Their variables are required by env.ts since F3-05: a missing one fails when the app starts
 * (dev, build, start), naming it. Each adapter is still created lazily, on first use.
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

let emailSender: EmailSender | undefined;
let captchaVerifier: CaptchaVerifier | undefined;
let rateLimiter: RateLimiter | undefined;

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
