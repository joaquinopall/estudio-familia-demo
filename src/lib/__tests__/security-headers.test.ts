import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  CSP_HEADER_NAME,
} from "@/lib/security/headers";

const headerMap = (isDev: boolean) =>
  new Map(buildSecurityHeaders({ isDev }).map(({ key, value }) => [key, value]));

describe("buildSecurityHeaders", () => {
  it("includes every header required by NFR-SEC-04 with the expected values", () => {
    const headers = headerMap(false);

    expect(headers.get("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Permissions-Policy")).toContain("microphone=()");
    expect(headers.get("Permissions-Policy")).toContain("geolocation=()");
  });

  it("sends the CSP in report-only mode during Phase 1 (NFR-SEC-05)", () => {
    const headers = headerMap(false);

    expect(CSP_HEADER_NAME).toBe("Content-Security-Policy-Report-Only");
    expect(headers.has("Content-Security-Policy-Report-Only")).toBe(true);
    expect(headers.has("Content-Security-Policy")).toBe(false);
  });

  it("does not include HSTS preload", () => {
    expect(headerMap(false).get("Strict-Transport-Security")).not.toContain("preload");
  });
});

describe("buildContentSecurityPolicy", () => {
  it("blocks framing, plugins and foreign base/form targets", () => {
    const csp = buildContentSecurityPolicy({ isDev: false });

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("allows Cloudflare Turnstile scripts and frames", () => {
    const csp = buildContentSecurityPolicy({ isDev: false });

    expect(csp).toMatch(/script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
    expect(csp).toContain("frame-src https://challenges.cloudflare.com");
  });

  it("adds 'unsafe-eval' only in development", () => {
    expect(buildContentSecurityPolicy({ isDev: true })).toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy({ isDev: false })).not.toContain("'unsafe-eval'");
  });

  it("produces a single-line header value", () => {
    expect(buildContentSecurityPolicy({ isDev: true })).not.toMatch(/[\r\n]/);
  });
});
