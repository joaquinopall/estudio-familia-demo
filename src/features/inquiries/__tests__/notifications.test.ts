// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  type NewInquiryForEmail,
  buildFirmNotification,
  buildReceipt,
  sendNewInquiryEmails,
} from "@/features/inquiries/notifications";
import { createLogger } from "@/lib/logger";
import { FakeEmailSender } from "@/lib/ports/fakes";

const INQUIRY: NewInquiryForEmail = {
  id: "7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b",
  reference: "C-7F3A9B21",
  fullName: "Ana Pérez",
  email: "ana@example.com",
  area: "SUCCESSION",
  urgency: "HIGH",
  preferredChannel: "WHATSAPP",
  safeToContact: true,
  emailIsPrivate: true,
};
const SITE_URL = "https://estudio.example.com";
const PANEL_URL = `${SITE_URL}/admin/consultas/${INQUIRY.id}`;

describe("buildFirmNotification", () => {
  it("goes to the firm with the subject, html, text and a per-inquiry idempotency key", async () => {
    const message = await buildFirmNotification(INQUIRY, {
      to: "estudio@example.com",
      panelUrl: PANEL_URL,
    });

    expect(message).toMatchObject({
      to: "estudio@example.com",
      subject: "Nueva consulta C-7F3A9B21 · Sucesiones",
      idempotencyKey: `inquiry-firm/${INQUIRY.id}`,
    });
    expect(message.html).toMatch(/^<!DOCTYPE html/i);
    expect(message.text).toContain("C-7F3A9B21");
  });

  it("starts the subject with [No iniciar contacto] when there is no safe channel", async () => {
    const message = await buildFirmNotification(
      { ...INQUIRY, safeToContact: false, emailIsPrivate: false },
      { to: "estudio@example.com", panelUrl: PANEL_URL },
    );
    expect(message.subject).toBe("[No iniciar contacto] Nueva consulta C-7F3A9B21 · Sucesiones");
  });
});

describe("buildReceipt", () => {
  it("goes to the person with the neutral subject and its own idempotency key", async () => {
    const message = await buildReceipt(INQUIRY, { signature: "Estudio Alameda" });

    expect(message).toMatchObject({
      to: "ana@example.com",
      subject: "Recibimos tu mensaje",
      idempotencyKey: `inquiry-receipt/${INQUIRY.id}`,
    });
    expect(message.text).toContain("Estudio Alameda");
  });
});

describe("sendNewInquiryEmails (FR-08, US-03 CA7)", () => {
  const deps = (sender: FakeEmailSender, logs: string[]) => ({
    emailSender: sender,
    logger: createLogger({ write: (_level, line) => logs.push(line) }),
    firmEmail: "estudio@example.com",
    siteUrl: SITE_URL,
    signature: "Estudio Alameda",
  });

  it("sends the firm notice and the receipt when the email is private", async () => {
    const sender = new FakeEmailSender();
    await sendNewInquiryEmails(deps(sender, []), INQUIRY);

    expect(sender.sent.map((email) => email.to)).toEqual([
      "estudio@example.com",
      "ana@example.com",
    ]);
    expect(sender.sent[0]?.html).toContain(PANEL_URL);
  });

  it("sends no receipt when the email is not private", async () => {
    const sender = new FakeEmailSender();
    await sendNewInquiryEmails(deps(sender, []), { ...INQUIRY, emailIsPrivate: false });

    expect(sender.sent.map((email) => email.to)).toEqual(["estudio@example.com"]);
  });

  it("never throws: logs each failure with the id and the provider code, no personal data", async () => {
    const sender = new FakeEmailSender();
    sender.failWith("validation_error");
    const logs: string[] = [];

    await expect(sendNewInquiryEmails(deps(sender, logs), INQUIRY)).resolves.toBeUndefined();

    const entries = logs.map((line) => JSON.parse(line));
    expect(entries.map((entry) => entry.event)).toEqual([
      "inquiry.firm_email_failed",
      "inquiry.receipt_email_failed",
    ]);
    expect(entries[0]).toMatchObject({ inquiryId: INQUIRY.id, errorCode: "validation_error" });
    expect(logs.join("\n")).not.toMatch(/Ana|example\.com/);
  });
});
