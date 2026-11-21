import { describe, expect, it } from "vitest";

import { getPracticeAreaBySlug, practiceAreas } from "@/content/practice-areas";

const nonEmpty = (text: string) => text.trim().length > 0;

describe("practiceAreas", () => {
  it("lists the 5 areas of FR-02, in order", () => {
    expect(practiceAreas.map((area) => area.inquiryArea)).toEqual([
      "SUCCESSION",
      "DIVORCE",
      "CHILD_SUPPORT",
      "PARENTING",
      "AGREEMENTS",
    ]);
  });

  it("uses unique, URL-safe slugs (lowercase kebab-case, no accents)", () => {
    const slugs = practiceAreas.map((area) => area.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it.each(practiceAreas.map((area) => [area.slug, area] as const))(
    "%s has every section of SPEC §11.3 / US-02 CA1",
    (_slug, area) => {
      expect(nonEmpty(area.title)).toBe(true);
      expect(nonEmpty(area.shortTitle)).toBe(true);
      expect(area.shortTitle.length).toBeLessThanOrEqual(area.title.length);
      expect(nonEmpty(area.summary)).toBe(true);
      expect(area.summary.length).toBeLessThanOrEqual(160);

      expect(area.intro.length).toBeGreaterThan(0);
      expect(area.intro.every(nonEmpty)).toBe(true);
      expect(area.whenToConsult.length).toBeGreaterThanOrEqual(3);
      expect(area.whenToConsult.every(nonEmpty)).toBe(true);
      expect(area.documents.length).toBeGreaterThanOrEqual(3);
      expect(area.documents.every(nonEmpty)).toBe(true);

      expect(area.faqs.length).toBeGreaterThanOrEqual(3);
      for (const faq of area.faqs) {
        expect(faq.question.trim()).toMatch(/^¿.+\?$/);
        expect(faq.answer.length).toBeGreaterThan(0);
        expect(faq.answer.every(nonEmpty)).toBe(true);
      }
    },
  );

  it.each(practiceAreas.map((area) => [area.slug, area.metadata] as const))(
    "%s has SEO metadata within recommended lengths",
    (_slug, metadata) => {
      expect(nonEmpty(metadata.title)).toBe(true);
      expect(metadata.title.length).toBeLessThanOrEqual(60);
      expect(metadata.description.length).toBeGreaterThanOrEqual(70);
      expect(metadata.description.length).toBeLessThanOrEqual(160);
    },
  );

  it("has unique metadata titles and descriptions (NFR-SEO-01)", () => {
    const titles = practiceAreas.map((area) => area.metadata.title);
    const descriptions = practiceAreas.map((area) => area.metadata.description);

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});

describe("getPracticeAreaBySlug", () => {
  it("returns the area for an existing slug", () => {
    expect(getPracticeAreaBySlug("sucesiones")?.inquiryArea).toBe("SUCCESSION");
  });

  it.each(["no-existe", "", "Sucesiones", "sucesiones/"])(
    "returns undefined for an unknown slug (%j)",
    (slug) => {
      expect(getPracticeAreaBySlug(slug)).toBeUndefined();
    },
  );
});
