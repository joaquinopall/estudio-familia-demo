import { describe, expect, it } from "vitest";
import { z } from "zod";

import { siteConfig } from "@/config/site.config";

describe("siteConfig", () => {
  it("has the firm data the public layout needs (FR-03)", () => {
    expect(siteConfig.name.trim()).not.toBe("");
    expect(siteConfig.shortName.trim()).not.toBe("");
    expect(siteConfig.description.length).toBeGreaterThan(50);
    expect(siteConfig.address.street.trim()).not.toBe("");
    expect(siteConfig.hours.length).toBeGreaterThan(0);
    expect(siteConfig.responseTime.trim()).not.toBe("");
  });

  it("states that the first conversation is confidential (SPEC §11.2)", () => {
    expect(siteConfig.confidentialityNote).toMatch(/primera conversación es confidencial/i);
  });

  it("lists every professional with a bar registration (SPEC §11.2)", () => {
    expect(siteConfig.professionals.length).toBeGreaterThan(0);
    for (const professional of siteConfig.professionals) {
      expect(professional.name.trim()).not.toBe("");
      expect(professional.registration.trim()).not.toBe("");
    }
  });

  it("uses contact formats the links rely on", () => {
    expect(siteConfig.contact.whatsappNumber).toMatch(/^\d{8,15}$/);
    expect(siteConfig.contact.phoneE164).toMatch(/^\d{8,15}$/);
    expect(z.email().safeParse(siteConfig.contact.email).success).toBe(true);
    expect(siteConfig.address.mapsUrl).toMatch(/^https:\/\//);
  });

  it("keeps the WhatsApp message generic (no personal data, US-04)", () => {
    const message = siteConfig.contact.whatsappMessage;

    expect(message).not.toMatch(/@|\d{6,}/);
    expect(message.length).toBeLessThanOrEqual(120);
  });

  it("has the exact disclaimer required by SPEC §11.4", () => {
    expect(siteConfig.legal.disclaimer).toBe(
      "La información de este sitio es general y no constituye asesoramiento legal.",
    );
    expect(siteConfig.legal.privacyHref).toBe("/privacidad");
  });

  it("navigates to the public routes of FR-01", () => {
    expect(siteConfig.navigation.map((item) => item.href)).toEqual([
      "/",
      "/areas",
      "/nosotros",
      "/preguntas-frecuentes",
      "/contacto",
    ]);
    expect(siteConfig.primaryCta).toEqual({ label: "Contanos tu caso", href: "/contacto" });
  });

  describe("while it is demo data (SPEC §11.4)", () => {
    it.runIf(siteConfig.isFictitious)("marks every registration as fictitious", () => {
      for (const professional of siteConfig.professionals) {
        expect(professional.registration).toMatch(/ficticia/i);
      }
    });

    it.runIf(siteConfig.isFictitious)("uses non-real contact data", () => {
      expect(siteConfig.contact.email.endsWith("@example.com")).toBe(true);
      expect(siteConfig.contact.whatsappNumber).toMatch(/0{8}$/);
      expect(siteConfig.contact.phoneE164).toMatch(/0{8}$/);
    });
  });
});
