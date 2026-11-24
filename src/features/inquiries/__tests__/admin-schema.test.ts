import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  ADMIN_MESSAGES as M,
  INQUIRIES_PAGE_SIZE,
  listFiltersSchema,
  updateNotesSchema,
  updateStatusSchema,
} from "@/features/inquiries/schema";

const ID = "7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b";

const errors = (result: z.ZodSafeParseResult<unknown>) =>
  result.success ? {} : z.flattenError(result.error).fieldErrors;

describe("updateStatusSchema (SPEC §6.5, FR-11)", () => {
  it.each(["NEW", "IN_REVIEW", "CONTACTED", "CLOSED", "DISCARDED"])("accepts %s", (status) => {
    expect(updateStatusSchema.parse({ id: ID, status })).toEqual({ id: ID, status });
  });

  it.each([undefined, "", "OPEN", "new"])("rejects status %j", (status) => {
    expect(errors(updateStatusSchema.safeParse({ id: ID, status }))).toEqual({
      status: [M.status],
    });
  });

  it.each([undefined, "", "123", "C-7F3A9B21", `${ID}x`])("rejects id %j", (id) => {
    expect(errors(updateStatusSchema.safeParse({ id, status: "NEW" }))).toEqual({
      id: [M.inquiryId],
    });
  });
});

describe("updateNotesSchema (SPEC §6.5, FR-12)", () => {
  it("trims and accepts up to 5000 characters", () => {
    expect(updateNotesSchema.parse({ id: ID, notes: "  Llamar el lunes.  " }).notes).toBe(
      "Llamar el lunes.",
    );
    expect(updateNotesSchema.parse({ id: ID, notes: "a".repeat(5000) }).notes).toHaveLength(5000);
  });

  it.each(["", "   "])("turns empty notes (%j) into null, which clears them", (notes) => {
    expect(updateNotesSchema.parse({ id: ID, notes }).notes).toBeNull();
  });

  it("rejects more than 5000 characters", () => {
    expect(errors(updateNotesSchema.safeParse({ id: ID, notes: "a".repeat(5001) }))).toEqual({
      notes: [M.notesTooLong],
    });
  });

  it("rejects an invalid id", () => {
    expect(errors(updateNotesSchema.safeParse({ id: "x", notes: "ok" }))).toEqual({
      id: [M.inquiryId],
    });
  });
});

describe("listFiltersSchema (US-06 CA2)", () => {
  it("defaults to page 1 and no filters", () => {
    expect(listFiltersSchema.parse({})).toEqual({ page: 1 });
  });

  it("reads valid filters from the URL", () => {
    expect(
      listFiltersSchema.parse({
        status: "NEW",
        area: "DIVORCE",
        urgency: "HIGH",
        q: "  pérez ",
        page: "3",
      }),
    ).toEqual({ status: "NEW", area: "DIVORCE", urgency: "HIGH", q: "pérez", page: 3 });
  });

  it.each([
    ["status", "OPEN"],
    ["area", "LEGAL"],
    ["urgency", "URGENT"],
    ["status", ["NEW", "CLOSED"]],
  ])("ignores an invalid %s (%j) instead of failing", (key, value) => {
    const result = listFiltersSchema.parse({ [key]: value });
    expect(result).not.toHaveProperty(key, expect.anything());
    expect(result.page).toBe(1);
  });

  it.each(["0", "-3", "1.5", "abc", "Infinity", ""])("falls back to page 1 for %j", (page) => {
    expect(listFiltersSchema.parse({ page }).page).toBe(1);
  });

  it("drops a blank search and cuts a long one to 100 characters", () => {
    expect(listFiltersSchema.parse({ q: "   " }).q).toBeUndefined();
    expect(listFiltersSchema.parse({ q: "a".repeat(150) }).q).toHaveLength(100);
  });

  it("lists 20 inquiries per page", () => {
    expect(INQUIRIES_PAGE_SIZE).toBe(20);
  });
});
