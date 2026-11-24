// @vitest-environment node
/**
 * Content of the inquiry emails (US-05 CA1, US-03 CA5–CA7, ADR-0005, §10.2, §11.5).
 * Checked on the rendered HTML and on the plain text, which some clients show instead.
 */
import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site.config";
import { receiptEmail } from "@/content/emails";
import InquiryReceiptEmail from "@/features/inquiries/emails/inquiry-receipt-email";
import NewInquiryEmail, { newInquirySubject } from "@/features/inquiries/emails/new-inquiry-email";
import { renderEmail } from "@/features/inquiries/emails/render";
import { PRACTICE_AREA_LABELS, URGENCY_LABELS } from "@/features/inquiries/labels";
import type { NewInquiryForEmail } from "@/features/inquiries/notifications";
import { PRACTICE_AREAS } from "@/features/inquiries/types";

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
/** The message is never part of the props; this guards against someone adding it. */
const MESSAGE_SNIPPET = "Falleció mi papá";

const renderFirm = (overrides: Partial<NewInquiryForEmail> = {}) =>
  renderEmail(<NewInquiryEmail inquiry={{ ...INQUIRY, ...overrides }} panelUrl={PANEL_URL} />);

const renderReceipt = (overrides: Partial<NewInquiryForEmail> = {}) => {
  const inquiry = { ...INQUIRY, ...overrides };
  return renderEmail(
    <InquiryReceiptEmail
      fullName={inquiry.fullName}
      reference={inquiry.reference}
      signature={siteConfig.shortName}
    />,
  );
};

/** HTML without tags, to search the visible text. */
const visible = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("NewInquiryEmail (to the firm, US-05 CA1)", () => {
  it("has every field, in Spanish, in the HTML and in the plain text", async () => {
    const { html, text } = await renderFirm();

    for (const output of [visible(html), text]) {
      for (const fragment of [
        "Nueva consulta",
        "C-7F3A9B21",
        "Ana Pérez",
        PRACTICE_AREA_LABELS.SUCCESSION,
        URGENCY_LABELS.HIGH,
        "Canal preferido",
        "WhatsApp",
        "¿Es seguro contactarla por ese medio?",
        "¿El email es privado?",
        "Ver la consulta en el panel",
      ]) {
        // The plain-text version uppercases headings ("NUEVA CONSULTA").
        expect(output.toLowerCase()).toContain(fragment.toLowerCase());
      }
    }
  });

  it("links to the inquiry in the panel", async () => {
    const { html } = await renderFirm();
    expect(html).toContain(`href="${PANEL_URL}"`);
  });

  it("highlights the safe channel first", async () => {
    const { text } = await renderFirm();
    expect(text.indexOf("Contactar por: WhatsApp")).toBeLessThan(text.indexOf("Referencia"));
  });

  it("highlights NO INICIAR CONTACTO when there is no safe channel (US-03 CA7)", async () => {
    const { html, text } = await renderFirm({ safeToContact: false, emailIsPrivate: false });

    expect(text.indexOf("NO INICIAR CONTACTO")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("NO INICIAR CONTACTO")).toBeLessThan(text.indexOf("Referencia"));
    expect(visible(html)).not.toContain("Contactar por:");
  });

  it("falls back to email when the phone is not safe but the email is private (US-03 CA6)", async () => {
    const { text } = await renderFirm({ safeToContact: false });
    expect(text).toContain("Contactar por: Email");
  });

  it("answers 'No aplica' to the safety question when the channel is email", async () => {
    const { text } = await renderFirm({ preferredChannel: "EMAIL", safeToContact: null });
    expect(text).toContain("No aplica (eligió email)");
  });

  it("never includes the message, and says it is read in the panel (ADR-0005)", async () => {
    const { html, text } = await renderFirm();

    expect(`${html}${text}`).not.toContain(MESSAGE_SNIPPET);
    expect(text).toContain("El mensaje no se incluye en este mail");
  });

  it("escapes the name in the HTML", async () => {
    const { html } = await renderFirm({ fullName: "Ana <script>x</script>" });
    expect(html).not.toContain("<script>x</script>");
  });

  it("declares the language for screen readers", async () => {
    expect((await renderFirm()).html).toContain('lang="es-AR"');
  });

  it("has the subject of US-05 with the reference and the area", () => {
    expect(newInquirySubject(INQUIRY)).toBe("Nueva consulta C-7F3A9B21 · Sucesiones");
  });
});

describe("InquiryReceiptEmail (to the person, US-03 CA5)", () => {
  it("has the name, the reference and the short firm name as signature", async () => {
    const { html, text } = await renderReceipt();

    for (const output of [visible(html), text]) {
      expect(output).toContain("Hola, Ana Pérez:");
      expect(output).toContain("C-7F3A9B21");
      expect(output).toContain(siteConfig.shortName);
    }
  });

  it.each(PRACTICE_AREAS)(
    "never reveals the reason for an inquiry about %s: no area, urgency, specialty or links",
    async (area) => {
      const { html, text } = await renderReceipt({ area, urgency: "HIGH" });
      const all = [receiptEmail.subject, receiptEmail.preview, html, text].join("\n");

      expect(all).not.toContain(PRACTICE_AREA_LABELS[area]);
      expect(all).not.toContain(URGENCY_LABELS.HIGH);
      for (const word of ["Familia", "familia", "Sucesi", "sucesi", "Divorc", "divorc", "abogad"]) {
        expect(all).not.toContain(word);
      }
      expect(all).not.toContain(siteConfig.name);
      expect(html).not.toMatch(/<a\s/i);
      expect(all).not.toContain(MESSAGE_SNIPPET);
    },
  );

  it("declares the language for screen readers", async () => {
    expect((await renderReceipt()).html).toContain('lang="es-AR"');
  });
});
