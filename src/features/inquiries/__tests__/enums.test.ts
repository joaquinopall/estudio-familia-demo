// @vitest-environment node
/**
 * The domain enums (types.ts) are defined by hand so the form does not depend on Prisma.
 * These tests keep them in sync with prisma/schema.prisma and the content of the site.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { practiceAreas } from "@/content/practice-areas";
import {
  CONTACT_CHANNELS,
  INQUIRY_STATUSES,
  PRACTICE_AREAS,
  URGENCIES,
} from "@/features/inquiries/types";

const prismaSchema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8");

function prismaEnum(name: string): string[] {
  const body = prismaSchema.match(new RegExp(`^enum ${name} \\{([^}]*)\\}`, "m"))?.[1];
  if (body === undefined) throw new Error(`enum ${name} not found in schema.prisma`);
  return body
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .filter(Boolean);
}

describe("domain enums (SPEC §7)", () => {
  it.each([
    ["PracticeArea", PRACTICE_AREAS],
    ["Urgency", URGENCIES],
    ["ContactChannel", CONTACT_CHANNELS],
    ["InquiryStatus", INQUIRY_STATUSES],
  ])("%s matches prisma/schema.prisma", (name, values) => {
    expect([...values]).toEqual(prismaEnum(name));
  });

  it("every practice area page maps to a PracticeArea value", () => {
    for (const area of practiceAreas) {
      expect(PRACTICE_AREAS).toContain(area.inquiryArea);
    }
  });

  it("every PracticeArea except OTHER has a page (FR-02)", () => {
    const withPage = practiceAreas.map((area) => area.inquiryArea);
    expect(PRACTICE_AREAS.filter((value) => value !== "OTHER")).toEqual(withPage);
  });
});
