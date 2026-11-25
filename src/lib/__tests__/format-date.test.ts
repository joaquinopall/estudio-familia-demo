import { describe, expect, it } from "vitest";

import { formatDateTime, formatLongDate } from "@/lib/format-date";

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

describe("formatDateTime (panel dates in the firm's time zone)", () => {
  const BUENOS_AIRES = "America/Argentina/Buenos_Aires";

  it("shows Argentina's time (UTC-3), not the server's", () => {
    // 01:30 UTC on the 26th is still the 25th at 22:30 in Buenos Aires.
    const text = formatDateTime(new Date("2026-11-26T01:30:00Z"), BUENOS_AIRES);

    expect(text).toMatch(/25\/11\/(20)?26/);
    expect(text).toContain("22:30");
  });

  it("uses a 24-hour clock", () => {
    expect(formatDateTime(new Date("2026-11-25T17:05:00Z"), BUENOS_AIRES)).toContain("14:05");
  });

  it("follows the configured zone (another firm, another zone)", () => {
    expect(formatDateTime(new Date("2026-11-25T17:05:00Z"), "UTC")).toContain("17:05");
  });
});
