import { describe, expect, it } from "vitest";

import { buildListHref } from "@/features/inquiries/list-href";
import { type ListFilters, listFiltersSchema } from "@/features/inquiries/schema";

const filters = (params: Record<string, string> = {}): ListFilters =>
  listFiltersSchema.parse(params);

describe("buildListHref (filters in the URL, US-06 CA2)", () => {
  it("is plain /admin without filters on page 1", () => {
    expect(buildListHref(filters())).toBe("/admin");
  });

  it("keeps every filter and the page, in a stable order", () => {
    expect(
      buildListHref(
        filters({ q: "ana", urgency: "HIGH", page: "3", area: "DIVORCE", status: "NEW" }),
      ),
    ).toBe("/admin?status=NEW&area=DIVORCE&urgency=HIGH&q=ana&page=3");
  });

  it("moves to another page keeping the filters", () => {
    expect(buildListHref(filters({ status: "NEW", page: "2" }), { page: 3 })).toBe(
      "/admin?status=NEW&page=3",
    );
  });

  it("goes back to page 1 when a filter changes", () => {
    expect(buildListHref(filters({ status: "NEW", page: "4" }), { area: "SUCCESSION" })).toBe(
      "/admin?status=NEW&area=SUCCESSION",
    );
  });

  it("drops a filter set to undefined", () => {
    expect(buildListHref(filters({ status: "NEW", q: "ana" }), { q: undefined })).toBe(
      "/admin?status=NEW",
    );
  });

  it("encodes the search text", () => {
    expect(buildListHref(filters({ q: "pérez & co" }))).toBe("/admin?q=p%C3%A9rez+%26+co");
  });
});
