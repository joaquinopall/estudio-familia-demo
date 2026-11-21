import { describe, expect, it } from "vitest";

import { formatLongDate } from "@/lib/format-date";

describe("formatLongDate", () => {
  it("formats an ISO date in Spanish (Argentina)", () => {
    expect(formatLongDate("2026-11-21")).toBe("21 de noviembre de 2026");
  });

  it("does not shift the day by time zone", () => {
    expect(formatLongDate("2026-01-01")).toBe("1 de enero de 2026");
  });

  it.each(["21/11/2026", "2026-13-01", "", "2026-11-21T10:00"])("rejects %j", (value) => {
    expect(() => formatLongDate(value)).toThrow("Invalid ISO date");
  });
});
