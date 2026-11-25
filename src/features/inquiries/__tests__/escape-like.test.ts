// @vitest-environment node
/**
 * Bug found by list.db.test.ts: Prisma's `contains` does not escape LIKE wildcards, so a search
 * with % or _ matched far more than the text.
 */
import { describe, expect, it } from "vitest";

import { escapeLike } from "@/features/inquiries/repository";

describe("escapeLike", () => {
  it.each([
    ["50%", "50\\%"],
    ["ana_maria", "ana\\_maria"],
    ["c:\\ruta", "c:\\\\ruta"],
    ["pérez", "pérez"],
  ])("escapes %j as %j", (input, expected) => {
    expect(escapeLike(input)).toBe(expected);
  });
});
