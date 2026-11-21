import { describe, expect, it } from "vitest";

import { areaPageContent, areasBreadcrumbs, areasIndexContent } from "@/content/area-pages";
import { getAreaContactHref } from "@/content/practice-areas";

describe("area pages content", () => {
  it("has the /areas copy and metadata within recommended lengths", () => {
    expect(areasIndexContent.title.trim()).not.toBe("");
    expect(areasIndexContent.lead.trim()).not.toBe("");
    expect(areasIndexContent.metadata.title.length).toBeLessThanOrEqual(60);
    expect(areasIndexContent.metadata.description.length).toBeGreaterThanOrEqual(70);
    expect(areasIndexContent.metadata.description.length).toBeLessThanOrEqual(160);
  });

  it("has every section label of an area page (SPEC §11.3)", () => {
    for (const label of Object.values(areaPageContent)) {
      expect(label.trim()).not.toBe("");
    }
  });

  it("starts the breadcrumbs at the home and ends them at /areas", () => {
    expect(areasBreadcrumbs.map((item) => item.href)).toEqual(["/", "/areas"]);
  });
});

describe("getAreaContactHref", () => {
  it("preselects the area in the contact form (SPEC §11.3)", () => {
    expect(getAreaContactHref("sucesiones")).toBe("/contacto?area=sucesiones");
  });

  it("encodes unexpected characters", () => {
    expect(getAreaContactHref("a b&c")).toBe("/contacto?area=a%20b%26c");
  });
});
