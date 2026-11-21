import { describe, expect, it } from "vitest";

import { faqGroups, generalFaqs, getFeaturedFaqs } from "@/content/faqs";
import { practiceAreas } from "@/content/practice-areas";

const normalize = (text: string) => text.trim().toLocaleLowerCase("es-AR");

describe("generalFaqs", () => {
  it("has between 8 and 12 questions (SPEC §11.3)", () => {
    expect(generalFaqs.length).toBeGreaterThanOrEqual(8);
    expect(generalFaqs.length).toBeLessThanOrEqual(12);
  });

  it("assigns every question to a declared group, and every group has questions", () => {
    const groupIds: string[] = faqGroups.map((group) => group.id);

    for (const faq of generalFaqs) {
      expect(groupIds).toContain(faq.group);
    }
    for (const id of groupIds) {
      expect(generalFaqs.some((faq) => faq.group === id)).toBe(true);
    }
  });

  it("has unique group ids and titles", () => {
    expect(new Set(faqGroups.map((group) => group.id)).size).toBe(faqGroups.length);
    expect(new Set(faqGroups.map((group) => group.title)).size).toBe(faqGroups.length);
  });

  it("has well-formed questions and non-empty answers", () => {
    for (const faq of generalFaqs) {
      expect(faq.question.trim()).toMatch(/^¿.+\?$/);
      expect(faq.answer.length).toBeGreaterThan(0);
      expect(faq.answer.every((paragraph) => paragraph.trim().length > 0)).toBe(true);
    }
  });

  it("does not repeat questions, including the ones of each area", () => {
    const questions = [
      ...generalFaqs.map((faq) => faq.question),
      ...practiceAreas.flatMap((area) => area.faqs.map((faq) => faq.question)),
    ].map(normalize);

    expect(new Set(questions).size).toBe(questions.length);
  });
});

describe("getFeaturedFaqs", () => {
  it("returns exactly the 3 featured questions for the home page (SPEC §11.3)", () => {
    const featured = getFeaturedFaqs();

    expect(featured).toHaveLength(3);
    expect(featured.every((faq) => faq.featured === true)).toBe(true);
  });
});
