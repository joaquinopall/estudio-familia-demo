"use server";

/**
 * Server Actions of inquiries (SPEC §6.5). Thin: they read the request, wire the real
 * dependencies and delegate (CLAUDE.md §3). The logic lives in submit-inquiry.ts (public form)
 * and update-inquiry.ts (panel: every one starts with requireStaffForAction, NFR-SEC-02).
 */
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";

import { siteConfig } from "@/config/site.config";
import { requireStaffForAction } from "@/features/auth/dal";
import { getCaptchaVerifier, getEmailSender, getRateLimiter } from "@/lib/adapters";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/security/ip";

import { sendNewInquiryEmails } from "./notifications";
import { getInquiryService } from "./server";
import { type SubmitInquiryState, createSubmitInquiryHandler } from "./submit-inquiry";
import {
  type UpdateNotesState,
  type UpdateStatusState,
  createUpdateInquiryHandlers,
} from "./update-inquiry";

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

function buildUpdateHandlers() {
  return createUpdateInquiryHandlers({
    authorize: requireStaffForAction,
    inquiryService: getInquiryService(),
    logger,
    onChanged: refresh,
  });
}

/** Panel: change the status (FR-11, FR-12), for useActionState(updateInquiryStatus, null). */
export async function updateInquiryStatus(
  _previous: UpdateStatusState,
  formData: FormData,
): Promise<UpdateStatusState> {
  return buildUpdateHandlers().updateStatus(formData);
}

/** Panel: save the internal notes (FR-12), for useActionState(updateInquiryNotes, null). */
export async function updateInquiryNotes(
  _previous: UpdateNotesState,
  formData: FormData,
): Promise<UpdateNotesState> {
  return buildUpdateHandlers().updateNotes(formData);
}

/** Contact form action (FR-04), for useActionState(submitInquiry, null). */
export async function submitInquiry(
  _previous: SubmitInquiryState,
  formData: FormData,
): Promise<SubmitInquiryState> {
  const clientIp = getClientIp(await headers());
  return buildSubmitInquiryHandler()({ formData, clientIp });
}
