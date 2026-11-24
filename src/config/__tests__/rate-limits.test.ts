import { describe, expect, it } from "vitest";

import { rateLimits } from "@/config/rate-limits";

describe("rateLimits (SPEC §8.2)", () => {
  it("matches the limits of the SPEC", () => {
    expect(rateLimits.inquiryByIp).toMatchObject({ limit: 5, window: "10 m" });
    expect(rateLimits.inquiryByEmail).toMatchObject({ limit: 3, window: "1 h" });
    expect(rateLimits.loginByIp).toMatchObject({ limit: 5, window: "15 m" });
  });

  it("has unique kebab-case names (they are storage prefixes)", () => {
    const names = Object.values(rateLimits).map((rule) => rule.name);

    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });
});
