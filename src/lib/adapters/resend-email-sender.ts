/**
 * EmailSender over Resend (ADR-0005, ADR-0013). The only file that imports the Resend SDK.
 */
import "server-only";

import { Resend } from "resend";

import type { EmailMessage, EmailSendResult, EmailSender } from "@/lib/ports/email-sender";

/** The part of the Resend client this adapter uses (lets tests pass a stub). */
export type ResendEmailsClient = { emails: Pick<Resend["emails"], "send"> };

export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly client: ResendEmailsClient,
    /** "Name <address>" from EMAIL_FROM: neutral, without the firm's specialty (US-03 CA5). */
    private readonly from: string,
  ) {}

  async send({ to, subject, html, text, idempotencyKey }: EmailMessage): Promise<EmailSendResult> {
    try {
      // The SDK returns { data, error } for API errors and only throws on network failures.
      const { data, error } = await this.client.emails.send(
        { from: this.from, to, subject, html, text },
        idempotencyKey ? { idempotencyKey } : undefined,
      );
      if (error || !data) return { ok: false, errorCode: error?.name ?? "unknown_error" };
      return { ok: true, id: data.id };
    } catch {
      return { ok: false, errorCode: "network_error" };
    }
  }
}

export function createResendEmailSender(config: { apiKey: string; from: string }): EmailSender {
  return new ResendEmailSender(new Resend(config.apiKey), config.from);
}
