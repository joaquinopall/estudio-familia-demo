/**
 * Logic of the submitInquiry Server Action (FR-04, FR-06, FR-08, SPEC §6.3, §6.5, ADR-0004,
 * ADR-0005, ADR-0013). Dependencies come in as parameters so every branch is tested with
 * fakes; actions.ts wires the real ones.
 *
 * Order (cheapest first, FR-06): honeypot → rate limit → validation → Turnstile → store →
 * respond → emails after the response.
 */
import { randomUUID } from "node:crypto";

import { type ActionResult, fail, ok, validationFailure } from "@/lib/action-result";
import type { Logger } from "@/lib/logger";
import type { CaptchaVerifier } from "@/lib/ports/captcha-verifier";
import type { RateLimitRule, RateLimiter } from "@/lib/ports/rate-limiter";
import { rateLimits } from "@/config/rate-limits";
import { hashIdentifier } from "@/lib/security/ip";

import { planContact } from "./contact-safety";
import { toReference } from "./reference";
import { type InquiryFormValues, extractFormValues } from "./form-values";
import { isHoneypotFilled, inquirySchema, type InquiryFormInput } from "./schema";
import type { CreatedInquiry, InquiryService } from "./service";
import type { NewInquiryForEmail } from "./notifications";

/** What the form needs to show the confirmation, even without JavaScript (US-03 CA3). */
export type SubmitInquiryOutput = { reference: string; doNotContact: boolean };
/**
 * On failure it also carries what the person typed (never the token nor the honeypot), so
 * the form can restore it (US-03 CA4).
 */
export type SubmitInquiryResult = ActionResult<SubmitInquiryOutput> & {
  values?: InquiryFormValues;
};
/** useActionState state: null before the first submit. */
export type SubmitInquiryState = SubmitInquiryResult | null;

export const TURNSTILE_TOKEN_FIELD = "cf-turnstile-response";

/** Turnstile could not answer: the form is rejected (ADR-0013), so offer another way. */
export const CAPTCHA_UNAVAILABLE_MESSAGE =
  "No pudimos verificar el formulario en este momento. Probá de nuevo en unos minutos o escribinos por WhatsApp.";

export type SubmitInquiryDeps = {
  rateLimiter: RateLimiter;
  captchaVerifier: CaptchaVerifier;
  inquiryService: Pick<InquiryService, "createInquiry">;
  sendEmails: (inquiry: NewInquiryForEmail) => Promise<void>;
  /** Runs work after the response is sent: next/server `after()` (FR-08). */
  runAfterResponse: (task: () => Promise<void>) => void;
  logger: Logger;
  ipHashSalt: string;
  randomId?: () => string;
};

export type SubmitInquiryRequest = { formData: FormData; clientIp: string | null };

const MAX_EMAIL_LENGTH = 254;

/** Email as typed, normalized like the schema does; null if it cannot be one. */
function rawEmail(formData: FormData): string | null {
  const value = formData.get("email");
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.includes("@") && email.length <= MAX_EMAIL_LENGTH ? email : null;
}

export function createSubmitInquiryHandler(deps: SubmitInquiryDeps) {
  const { logger } = deps;
  const randomId = deps.randomId ?? randomUUID;

  async function checkRateLimits(
    checks: { rule: RateLimitRule; key: string }[],
  ): Promise<number | null> {
    const results = await Promise.all(
      checks.map(({ rule, key }) => deps.rateLimiter.limit(rule, key)),
    );
    let retryAfter: number | null = null;
    results.forEach((result, index) => {
      if (result.status === "unavailable") {
        // ADR-0013: let it through and leave a trace; Turnstile still protects the form.
        logger.warn("rate_limit.unavailable", { errorCode: checks[index]?.rule.name });
      } else if (result.status === "limited") {
        retryAfter = Math.max(retryAfter ?? 0, result.retryAfterSeconds);
      }
    });
    return retryAfter;
  }

  /** Any failure gives back what was typed, so the form does not lose it (US-03 CA4). */
  return async function submitInquiry(request: SubmitInquiryRequest): Promise<SubmitInquiryResult> {
    const result = await handle(request);
    return result.ok ? result : { ...result, values: extractFormValues(request.formData) };
  };

  async function handle({
    formData,
    clientIp,
  }: SubmitInquiryRequest): Promise<ActionResult<SubmitInquiryOutput>> {
    // 1. Honeypot: a bot filled the hidden field. Fake success; nothing stored or sent.
    if (isHoneypotFilled(formData)) {
      logger.info("inquiry.honeypot");
      return ok({ reference: toReference(randomId()), doNotContact: false });
    }

    // 2. Rate limit per IP and per email, with hashed keys (Upstash never sees either).
    const ipHash = clientIp ? hashIdentifier(deps.ipHashSalt, "ip", clientIp) : null;
    const email = rawEmail(formData);
    const checks = [
      ...(ipHash ? [{ rule: rateLimits.inquiryByIp, key: ipHash }] : []),
      ...(email
        ? [
            {
              rule: rateLimits.inquiryByEmail,
              key: hashIdentifier(deps.ipHashSalt, "email", email),
            },
          ]
        : []),
    ];
    if (!ipHash) logger.warn("rate_limit.no_client_ip");
    if ((await checkRateLimits(checks)) !== null) {
      logger.info("inquiry.rate_limited");
      return fail("RATE_LIMITED");
    }

    // 3. Validation (the same schema as the form, FR-05).
    const parsed = inquirySchema.safeParse(Object.fromEntries(formData) as InquiryFormInput);
    if (!parsed.success) return validationFailure(parsed.error);
    const data = parsed.data;

    // 4. Turnstile, verified on the server.
    const token = formData.get(TURNSTILE_TOKEN_FIELD);
    const captcha = await deps.captchaVerifier.verify({
      token: typeof token === "string" ? token : "",
      ...(clientIp ? { remoteIp: clientIp } : {}),
    });
    if (captcha.status !== "ok") {
      const errorCode = captcha.errorCodes.join(",");
      if (captcha.status === "unavailable") {
        logger.error("captcha.unavailable", { errorCode });
        return fail("CAPTCHA_FAILED", CAPTCHA_UNAVAILABLE_MESSAGE);
      }
      logger.warn("captcha.invalid", { errorCode });
      return fail("CAPTCHA_FAILED");
    }

    // 5. Store the inquiry and its CREATED event.
    let created: CreatedInquiry;
    try {
      created = await deps.inquiryService.createInquiry(data, { ipHash });
    } catch (error) {
      logger.error("inquiry.store_failed", { error, errorCode: (error as Error)?.name });
      return fail("INTERNAL");
    }
    logger.info("inquiry.created", { inquiryId: created.id });

    // 6. Emails after responding: a failure never loses the inquiry (FR-08).
    const forEmail: NewInquiryForEmail = { ...data, ...created };
    deps.runAfterResponse(async () => {
      try {
        await deps.sendEmails(forEmail);
      } catch (error) {
        logger.error("inquiry.emails_failed", { inquiryId: created.id, error });
      }
    });

    return ok({ reference: created.reference, doNotContact: planContact(data).doNotContact });
  }
}
