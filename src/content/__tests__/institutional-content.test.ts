import { describe, expect, it } from "vitest";

import { aboutContent } from "@/content/about";
import { faqPageContent } from "@/content/faq-page";
import { faqGroups, generalFaqs, getFaqsByGroup } from "@/content/faqs";

const metadataCases = [
  ["about", aboutContent.metadata],
  ["faq page", faqPageContent.metadata],
] as const;

describe("institutional pages content", () => {
  it.each(metadataCases)("%s has metadata within recommended lengths", (_name, metadata) => {
    expect(metadata.title.length).toBeLessThanOrEqual(60);
    expect(metadata.description.length).toBeGreaterThanOrEqual(70);
    expect(metadata.description.length).toBeLessThanOrEqual(160);
  });

  it("has the about sections of SPEC §11.3 filled in", () => {
    expect(aboutContent.approach.paragraphs.length).toBeGreaterThan(0);
    expect(aboutContent.values.items.length).toBeGreaterThanOrEqual(3);
    for (const value of aboutContent.values.items) {
      expect(value.title.trim()).not.toBe("");
      expect(value.description.trim()).not.toBe("");
    }
  });

  it("ends each breadcrumb trail at its own page", () => {
    expect(aboutContent.breadcrumbs.at(-1)?.href).toBe("/nosotros");
    expect(faqPageContent.breadcrumbs.at(-1)?.href).toBe("/preguntas-frecuentes");
  });
});

describe("getFaqsByGroup", () => {
  it("returns the groups in order, with every question exactly once", () => {
    const groups = getFaqsByGroup();

    expect(groups.map((group) => group.id)).toEqual(faqGroups.map((group) => group.id));
    expect(groups.flatMap((group) => group.faqs)).toHaveLength(generalFaqs.length);
    for (const group of groups) {
      expect(group.faqs.length).toBeGreaterThan(0);
      expect(group.faqs.every((faq) => faq.group === group.id)).toBe(true);
    }
  });
});
