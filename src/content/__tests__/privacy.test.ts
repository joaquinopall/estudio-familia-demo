import { describe, expect, it } from "vitest";

import { AAIP_ACCESS_NOTICE, AAIP_AUTHORITY_NOTICE, privacyPolicy } from "@/content/legal/privacy";
import { formatLongDate } from "@/lib/format-date";

const allText = privacyPolicy.sections
  .flatMap((section) => [
    section.title,
    ...("paragraphs" in section ? section.paragraphs : []),
    ...("items" in section ? section.items : []),
    ...("closing" in section ? section.closing : []),
  ])
  .join("\n");

describe("privacyPolicy (US-07, Ley 25.326)", () => {
  it("is versioned with a value that fits Inquiry.privacyPolicyVersion (VarChar 20)", () => {
    expect(privacyPolicy.version).toMatch(/^\d+\.\d+$/);
    expect(privacyPolicy.version.length).toBeLessThanOrEqual(20);
  });

  it("has a valid effective date", () => {
    expect(() => formatLongDate(privacyPolicy.effectiveDate)).not.toThrow();
  });

  it("has unique, anchor-safe section ids and every section has text", () => {
    const ids = privacyPolicy.sections.map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const section of privacyPolicy.sections) {
      expect(section.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(section.title.trim()).not.toBe("");
      expect("paragraphs" in section || "items" in section).toBe(true);
    }
  });

  it("has a section for the controller, rendered with site.config data (FR-03)", () => {
    expect(ids()).toContain(privacyPolicy.controllerId);
  });

  it("includes the mandatory AAIP notices verbatim (Disposición 10/2008)", () => {
    expect(allText).toContain(AAIP_ACCESS_NOTICE);
    expect(allText).toContain(AAIP_AUTHORITY_NOTICE);
    expect(AAIP_AUTHORITY_NOTICE).toMatch(/^La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA/);
  });

  it("covers purpose, rights, international transfers and the 24-month retention", () => {
    for (const id of ["datos", "finalidad", "terceros", "conservacion", "derechos", "autoridad"]) {
      expect(ids()).toContain(id);
    }
    expect(allText).toMatch(/24 meses/);
    expect(allText).toMatch(/art\. 12/);
    expect(allText).toMatch(/Rectificarlos/);
    expect(allText).toMatch(/eliminemos/);
  });

  it("explains safe contact and the receipt only to a private email (v1.1, US-03 CA5–CA7)", () => {
    expect(Number(privacyPolicy.version)).toBeGreaterThanOrEqual(1.1);
    expect(allText).toMatch(/si es seguro contactarte por ese medio/);
    expect(allText).toMatch(/si tu email es privado/i);
    expect(allText).toMatch(/acuse se envía solo si nos indicaste que tu email es privado/);
    expect(allText).toMatch(/no menciona el motivo de tu consulta/);
    expect(allText).toMatch(/Si no hay ningún medio seguro, no te contactamos nosotros/);
  });

  it("names every provider that processes data on behalf of the firm", () => {
    for (const provider of ["Vercel", "Supabase", "Resend", "Cloudflare", "Upstash"]) {
      expect(allText).toContain(provider);
    }
  });

  it("has SEO metadata within recommended lengths", () => {
    expect(privacyPolicy.metadata.title.length).toBeLessThanOrEqual(60);
    expect(privacyPolicy.metadata.description.length).toBeGreaterThanOrEqual(70);
    expect(privacyPolicy.metadata.description.length).toBeLessThanOrEqual(160);
  });
});

function ids(): string[] {
  return privacyPolicy.sections.map((section) => section.id);
}
