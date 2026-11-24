/**
 * Port for sending emails (NFR-ESC-02, ADR-0013). Adapter: lib/adapters/resend-email-sender.ts.
 *
 * Never throws: every failure comes back as a result, so callers handle it explicitly
 * (FR-08: a failed email must not lose the inquiry).
 */

export type EmailMessage = {
  to: string;
  subject: string;
  /** Rendered HTML (templates are built in features/inquiries/emails, F3-06). */
  html: string;
  /** Plain-text version, for clients that do not show HTML. */
  text: string;
  /**
   * Same key = same email: the provider does not send it twice if the call is retried.
   * Pattern `<event>/<id>`, e.g. `inquiry-receipt/<inquiryId>`. Never personal data.
   */
  idempotencyKey?: string;
};

export type EmailSendResult =
  | { ok: true; id: string }
  /** errorCode is the provider's code (e.g. "validation_error") or "network_error". */
  | { ok: false; errorCode: string };

export interface EmailSender {
  send(message: EmailMessage): Promise<EmailSendResult>;
}
