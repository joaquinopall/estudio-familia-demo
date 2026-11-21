import { describe, expect, it } from "vitest";

import { homeContent } from "@/content/home";

describe("homeContent", () => {
  it("has the 3 steps of 'Cómo trabajamos' (SPEC §11.3)", () => {
    expect(homeContent.process.steps.map((step) => step.title)).toEqual([
      "Contanos tu caso",
      "Te llamamos y analizamos tu situación",
      "Te proponemos un camino claro",
    ]);
  });

  it("has every text filled in", () => {
    const sections = [
      homeContent.hero,
      homeContent.areas,
      homeContent.process,
      homeContent.trust,
      homeContent.faqs,
      homeContent.finalCta,
    ];

    for (const section of sections) {
      expect(section.title.trim()).not.toBe("");
    }
    for (const lead of [homeContent.hero.lead, ...sections.map((s) => s.lead)]) {
      expect(lead.trim()).not.toBe("");
    }
    for (const step of homeContent.process.steps) {
      expect(step.description.trim()).not.toBe("");
    }
  });

  it("keeps the hero short enough to fit above the fold on mobile (US-01 CA1)", () => {
    expect(homeContent.hero.title.length).toBeLessThanOrEqual(70);
    expect(homeContent.hero.lead.length).toBeLessThanOrEqual(160);
  });
});
