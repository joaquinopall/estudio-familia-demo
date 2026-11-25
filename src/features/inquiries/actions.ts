"use server";

/**
 * Server Actions of inquiries (SPEC §6.5). Thin: they read the request, wire the real
 * dependencies and delegate (CLAUDE.md §3). The logic lives in submit-inquiry.ts.
 */
import { headers } from "next/headers";
import { after } from "next/server";

import { siteConfig } from "@/config/site.config";
import { getCaptchaVerifier, getEmailSender, getRateLimiter } from "@/lib/adapters";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/security/ip";

import { sendNewInquiryEmails } from "./notifications";
import { getInquiryService } from "./server";
import { type SubmitInquiryState, createSubmitInquiryHandler } from "./submit-inquiry";

function buildSubmitInquiryHandler() {
  return createSubmitInquiryHandler({
    rateLimiter: getRateLimiter(),
    captchaVerifier: getCaptchaVerifier(),
    inquiryService: getInquiryService(),
    sendEmails: (inquiry) =>
      sendNewInquiryEmails(
        {
          emailSender: getEmailSender(),
          logger,
          firmEmail: env.FIRM_NOTIFICATION_EMAIL,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
          signature: siteConfig.shortName,
        },
        inquiry,
      ),
    runAfterResponse: after,
    logger,
    ipHashSalt: env.IP_HASH_SALT,
  });
}

/** Contact form action (FR-04), for useActionState(submitInquiry, null). */
export async function submitInquiry(
  _previous: SubmitInquiryState,
  formData: FormData,
): Promise<SubmitInquiryState> {
  const clientIp = getClientIp(await headers());
  return buildSubmitInquiryHandler()({ formData, clientIp });
}
