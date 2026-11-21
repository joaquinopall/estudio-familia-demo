import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site.config";
import { faqGroups, generalFaqs } from "@/content/faqs";
import { practiceAreas } from "@/content/practice-areas";

/** Every string inside a content value, with the path where it was found. */
function collectTexts(value: unknown, path: string): { path: string; text: string }[] {
  if (typeof value === "string") return [{ path, text: value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectTexts(item, `${path}[${index}]`));
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => collectTexts(item, `${path}.${key}`));
  }
  return [];
}

const texts = [
  ...collectTexts(practiceAreas, "practiceAreas"),
  ...collectTexts(generalFaqs, "generalFaqs"),
  ...collectTexts(faqGroups, "faqGroups"),
];

/**
 * Wording that breaks the professional advertising rules of SPEC §11.4: promises of results,
 * self-praise or comparisons, and testimonials. Matched case-insensitively.
 */
const forbiddenPatterns: { reason: string; pattern: RegExp }[] = [
  { reason: "promesa de resultado", pattern: /garantiz/i },
  { reason: "promesa de resultado", pattern: /te aseguramos|aseguramos que/i },
  { reason: "promesa de resultado", pattern: /100\s?%/ },
  { reason: "promesa de resultado", pattern: /\bganar\b|\bganamos\b/i },
  { reason: "promesa de resultado", pattern: /éxito|exitos[oa]/i },
  { reason: "autoelogio o comparación", pattern: /\b(el|los|la|las) mejor(es)?\b/i },
  { reason: "autoelogio o comparación", pattern: /número uno|n[º°] ?1\b|líderes?\b/i },
  {
    reason: "testimonios o reseñas",
    pattern: /testimoni|reseña|opiniones de (nuestros )?clientes/i,
  },
];

describe("content guidelines (SPEC §11.4)", () => {
  it("collects the content texts", () => {
    expect(texts.length).toBeGreaterThan(100);
  });

  it.each(forbiddenPatterns)("has no $reason ($pattern)", ({ pattern }) => {
    const offending = texts.filter(({ text }) => pattern.test(text)).map(({ path }) => path);

    expect(offending).toEqual([]);
  });

  it("does not repeat firm data, which comes from site.config.ts (FR-03)", () => {
    const firmTerms = [siteConfig.shortName, siteConfig.contact.email, siteConfig.address.street];

    const offending = texts.filter(
      ({ text }) =>
        firmTerms.some((term) => text.includes(term)) || /@|\d{6,}|\d{2,4}[- ]\d{4}/.test(text),
    );

    expect(offending.map(({ path }) => path)).toEqual([]);
  });
});
