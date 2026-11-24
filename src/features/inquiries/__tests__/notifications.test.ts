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
const PANEL_URL =
  "https://estudio.example.com/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b";
const MESSAGE = "Falleció mi papá y queremos iniciar la sucesión con mis hermanos.";

const firm = (overrides: Partial<NewInquiryForEmail> = {}) =>
  buildFirmNotification(
    { ...INQUIRY, ...overrides },
    { to: "estudio@example.com", panelUrl: PANEL_URL },
  );

describe("buildFirmNotification (US-05 CA1)", () => {
  it("includes area, urgency, channel, safe-contact answers, name, reference and the panel link", () => {
    const { to, subject, text } = firm();

    expect(to).toBe("estudio@example.com");
    expect(subject).toBe("Nueva consulta C-7F3A9B21 · Sucesiones");
    for (const fragment of [
      "Contactar por: WhatsApp",
      "Nombre: Ana Pérez",
      "Área: Sucesiones",
      "Urgencia: Tengo un plazo o una audiencia cercana",
      "Canal preferido: WhatsApp",
      "¿Es seguro contactar por ese canal?: Sí",
      "¿El email es privado?: Sí",
      PANEL_URL,
    ]) {
      expect(text).toContain(fragment);
    }
  });

  it("never includes the message (data minimization)", () => {
    const { text, html } = firm();
    expect(`${text}${html}`).not.toContain("Falleció");
    expect(MESSAGE).toContain("Falleció");
  });

  it("highlights 'No iniciar contacto' in the subject and first line when there is no safe channel", () => {
    const { subject, text } = firm({ safeToContact: false, emailIsPrivate: false });

    expect(subject).toMatch(/^\[No iniciar contacto\]/);
    expect(text.split("\n")[0]).toMatch(/^NO INICIAR CONTACTO/);
  });

  it("points to email when the phone is not safe but the email is private", () => {
    expect(firm({ safeToContact: false }).text).toContain("Contactar por: Email");
  });

  it("shows 'No aplica' for safeToContact with the email channel", () => {
    expect(firm({ preferredChannel: "EMAIL", safeToContact: null }).text).toContain(
      "¿Es seguro contactar por ese canal?: No aplica",
    );
  });

  it("escapes HTML and uses a per-inquiry idempotency key", () => {
    const message = firm({ fullName: "Ana <b>" });
    expect(message.html).toContain("Ana &#60;b&#62;");
    expect(message.idempotencyKey).toBe(`inquiry-firm/${INQUIRY.id}`);
  });
});

describe("buildReceipt (US-03 CA5)", () => {
  it("goes to the person with a neutral subject, the name and the reference", () => {
    const { to, subject, text } = buildReceipt(INQUIRY);

    expect(to).toBe("ana@example.com");
    expect(subject).toBe("Recibimos tu mensaje");
    expect(text).toContain("Ana Pérez");
    expect(text).toContain("C-7F3A9B21");
  });

  it("never reveals the reason: no area, urgency or specialty", () => {
    const { subject, text, html } = buildReceipt(INQUIRY);
    const all = `${subject}${text}${html}`;

    for (const word of ["Sucesi", "Familia", "familia", "divorcio", "audiencia", "plazo"]) {
      expect(all).not.toContain(word);
    }
  });
});

describe("sendNewInquiryEmails (FR-08, US-03 CA7)", () => {
  const deps = (sender: FakeEmailSender, logs: string[]) => ({
    emailSender: sender,
    logger: createLogger({ write: (_level, line) => logs.push(line) }),
    firmEmail: "estudio@example.com",
    siteUrl: "https://estudio.example.com",
  });

  it("sends the firm notice and the receipt when the email is private", async () => {
    const sender = new FakeEmailSender();
    await sendNewInquiryEmails(deps(sender, []), INQUIRY);

    expect(sender.sent.map((email) => email.to)).toEqual([
      "estudio@example.com",
      "ana@example.com",
    ]);
    expect(sender.sent[0]?.text).toContain(PANEL_URL);
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
