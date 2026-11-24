// @vitest-environment node
import { describe, expect, it } from "vitest";

import { getClientIp, hashIdentifier } from "@/lib/security/ip";

const headersOf = (values: Record<string, string>) => new Headers(values);
const SALT = "s".repeat(32);

describe("getClientIp", () => {
  it("takes the first entry of x-forwarded-for (the client, on Vercel)", () => {
    expect(getClientIp(headersOf({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe(
      "203.0.113.7",
    );
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(headersOf({ "x-real-ip": " 198.51.100.4 " }))).toBe("198.51.100.4");
  });

  it.each<Record<string, string>>([
    {},
    { "x-forwarded-for": "" },
    { "x-forwarded-for": " , ", "x-real-ip": " " },
  ])("returns null when the IP is unknown (%j)", (values) => {
    expect(getClientIp(headersOf(values))).toBeNull();
  });

  it("accepts IPv6", () => {
    expect(getClientIp(headersOf({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });
});

describe("hashIdentifier", () => {
  it("is a 64-character hex HMAC, stable for the same input", () => {
    const hash = hashIdentifier(SALT, "ip", "203.0.113.7");

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIdentifier(SALT, "ip", "203.0.113.7")).toBe(hash);
  });

  it("never contains the original value", () => {
    expect(hashIdentifier(SALT, "email", "ana@example.com")).not.toContain("ana");
  });

  it("gives different hashes for an IP and an email with the same text", () => {
    expect(hashIdentifier(SALT, "ip", "x")).not.toBe(hashIdentifier(SALT, "email", "x"));
  });

  it("depends on the salt, so hashes cannot be recomputed without it", () => {
    expect(hashIdentifier(SALT, "ip", "203.0.113.7")).not.toBe(
      hashIdentifier("t".repeat(32), "ip", "203.0.113.7"),
    );
  });
});
