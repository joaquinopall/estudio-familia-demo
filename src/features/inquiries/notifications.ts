/**
 * Emails of a new inquiry (US-05, US-03 CA5, FR-08, ADR-0005). Pure: the sender and the logger
 * come in as parameters.
 *
 * - To the firm, always: area, urgency, channel, the safe-contact answers, "No iniciar
 *   contacto" when it applies, name, reference and the link to the panel. NEVER the message
 *   (data minimization: it is read in the panel, behind the login).
 * - Receipt to the person, only if their email is private (planContact): neutral subject,
 *   text and signature; no area, no specialty, nothing that reveals the reason (§11.5).
 *
 * Content: React Email templates in ./emails (F3-06), texts in content/emails.ts.
 */
import { createElement } from "react";

import type { Logger } from "@/lib/logger";
import type { EmailMessage, EmailSender } from "@/lib/ports/email-sender";

import { planContact } from "./contact-safety";
import InquiryReceiptEmail, { receiptSubject } from "./emails/inquiry-receipt-email";
import NewInquiryEmail, { newInquirySubject } from "./emails/new-inquiry-email";
import { renderEmail } from "./emails/render";
import type { InquiryData } from "./schema";

export type NewInquiryForEmail = Pick<
  InquiryData,
  | "fullName"
  | "email"
  | "area"
  | "urgency"
  | "preferredChannel"
  | "safeToContact"
  | "emailIsPrivate"
> & { id: string; reference: string };

export async function buildFirmNotification(
  inquiry: NewInquiryForEmail,
  options: { to: string; panelUrl: string },
): Promise<EmailMessage> {
  const { html, text } = await renderEmail(
    createElement(NewInquiryEmail, { inquiry, panelUrl: options.panelUrl }),
  );
  return {
    to: options.to,
    subject: newInquirySubject(inquiry),
    html,
    text,
    idempotencyKey: `inquiry-firm/${inquiry.id}`,
  };
}

/** Neutral receipt (US-03 CA5): only the name, the reference and the short firm name. */
export async function buildReceipt(
  inquiry: NewInquiryForEmail,
  options: { signature: string },
): Promise<EmailMessage> {
  const { html, text } = await renderEmail(
    createElement(InquiryReceiptEmail, {
      fullName: inquiry.fullName,
      reference: inquiry.reference,
      signature: options.signature,
    }),
  );
  return {
    to: inquiry.email,
    subject: receiptSubject,
    html,
    text,
    idempotencyKey: `inquiry-receipt/${inquiry.id}`,
  };
}

export type InquiryEmailsDeps = {
  emailSender: EmailSender;
  logger: Logger;
  firmEmail: string;
  siteUrl: string;
  /** Signature of the receipt: siteConfig.shortName, without the specialty. */
  signature: string;
};

/**
 * Sends both emails. Never throws: a failure is logged with the inquiry id and the provider
 * code, never with personal data (FR-08, NFR-SEC-06). The inquiry is already stored.
 */
export async function sendNewInquiryEmails(
  { emailSender, logger, firmEmail, siteUrl, signature }: InquiryEmailsDeps,
  inquiry: NewInquiryForEmail,
): Promise<void> {
  const panelUrl = new URL(`/admin/consultas/${inquiry.id}`, siteUrl).toString();
  const firm = await emailSender.send(
    await buildFirmNotification(inquiry, { to: firmEmail, panelUrl }),
  );
  if (!firm.ok) {
    logger.error("inquiry.firm_email_failed", { inquiryId: inquiry.id, errorCode: firm.errorCode });
  }

  if (!planContact(inquiry).sendReceipt) return;
  const receipt = await emailSender.send(await buildReceipt(inquiry, { signature }));
  if (!receipt.ok) {
    logger.error("inquiry.receipt_email_failed", {
      inquiryId: inquiry.id,
      errorCode: receipt.errorCode,
    });
  }
}
