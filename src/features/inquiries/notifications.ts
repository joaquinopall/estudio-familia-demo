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
 * F3-05 ships plain provisional texts that already follow those rules; F3-06 replaces only
 * the content with React Email templates.
 */
import type { Logger } from "@/lib/logger";
import type { EmailMessage, EmailSender } from "@/lib/ports/email-sender";

import { planContact } from "./contact-safety";
import { CONTACT_CHANNEL_LABELS, PRACTICE_AREA_LABELS, URGENCY_LABELS } from "./labels";
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

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const yesNo = (value: boolean | null) => (value === null ? "No aplica" : value ? "Sí" : "No");

export function buildFirmNotification(
  inquiry: NewInquiryForEmail,
  options: { to: string; panelUrl: string },
): EmailMessage {
  const plan = planContact(inquiry);
  const lines = [
    plan.doNotContact
      ? "NO INICIAR CONTACTO: la persona no indicó ningún medio seguro."
      : `Contactar por: ${CONTACT_CHANNEL_LABELS[plan.channel]}`,
    `Referencia: ${inquiry.reference}`,
    `Nombre: ${inquiry.fullName}`,
    `Área: ${PRACTICE_AREA_LABELS[inquiry.area]}`,
    `Urgencia: ${URGENCY_LABELS[inquiry.urgency]}`,
    `Canal preferido: ${CONTACT_CHANNEL_LABELS[inquiry.preferredChannel]}`,
    `¿Es seguro contactar por ese canal?: ${yesNo(inquiry.safeToContact)}`,
    `¿El email es privado?: ${yesNo(inquiry.emailIsPrivate)}`,
    "",
    "El mensaje se lee en el panel:",
    options.panelUrl,
  ];
  const subject = `${plan.doNotContact ? "[No iniciar contacto] " : ""}Nueva consulta ${inquiry.reference} · ${PRACTICE_AREA_LABELS[inquiry.area]}`;

  return {
    to: options.to,
    subject,
    text: lines.join("\n"),
    html: lines.map((line) => (line === "" ? "<br>" : `<p>${escapeHtml(line)}</p>`)).join("\n"),
    idempotencyKey: `inquiry-firm/${inquiry.id}`,
  };
}

/** Neutral receipt (US-03 CA5): only the name and the reference, no reason for the inquiry. */
export function buildReceipt(inquiry: NewInquiryForEmail): EmailMessage {
  const lines = [
    `Hola, ${inquiry.fullName}:`,
    "Recibimos tu mensaje. Te vamos a responder dentro de las próximas 24 a 48 horas hábiles.",
    `Tu número de referencia es ${inquiry.reference}.`,
    "Saludos.",
  ];
  return {
    to: inquiry.email,
    subject: "Recibimos tu mensaje",
    text: lines.join("\n\n"),
    html: lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n"),
    idempotencyKey: `inquiry-receipt/${inquiry.id}`,
  };
}

export type InquiryEmailsDeps = {
  emailSender: EmailSender;
  logger: Logger;
  firmEmail: string;
  siteUrl: string;
};

/**
 * Sends both emails. Never throws: a failure is logged with the inquiry id and the provider
 * code, never with personal data (FR-08, NFR-SEC-06). The inquiry is already stored.
 */
export async function sendNewInquiryEmails(
  { emailSender, logger, firmEmail, siteUrl }: InquiryEmailsDeps,
  inquiry: NewInquiryForEmail,
): Promise<void> {
  const panelUrl = new URL(`/admin/consultas/${inquiry.id}`, siteUrl).toString();
  const firm = await emailSender.send(buildFirmNotification(inquiry, { to: firmEmail, panelUrl }));
  if (!firm.ok) {
    logger.error("inquiry.firm_email_failed", { inquiryId: inquiry.id, errorCode: firm.errorCode });
  }

  if (!planContact(inquiry).sendReceipt) return;
  const receipt = await emailSender.send(buildReceipt(inquiry));
  if (!receipt.ok) {
    logger.error("inquiry.receipt_email_failed", {
      inquiryId: inquiry.id,
      errorCode: receipt.errorCode,
    });
  }
}
