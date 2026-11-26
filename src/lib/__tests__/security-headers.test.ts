import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  CSP_HEADER_NAME,
} from "@/lib/security/headers";

const PROD = { isDev: false, vercelToolbar: false };
const DEV = { isDev: true, vercelToolbar: false };
const PREVIEW = { isDev: false, vercelToolbar: true };

const headerMap = (options = PROD) =>
  new Map(buildSecurityHeaders(options).map(({ key, value }) => [key, value]));

/** The sources of one directive, e.g. directive(csp, "script-src"). */
function directive(csp: string, name: string): string[] {
  const entry = csp
    .split("; ")
    .map((part) => part.split(" "))
    .find(([directiveName]) => directiveName === name);
  if (!entry) throw new Error(`missing directive ${name}`);
  return entry.slice(1);
}

describe("buildSecurityHeaders", () => {
  it("includes every header required by NFR-SEC-04 with the expected values", () => {
    const headers = headerMap();

    expect(headers.get("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Permissions-Policy")).toContain("microphone=()");
    expect(headers.get("Permissions-Policy")).toContain("geolocation=()");
  });

  it("enforces the CSP and no longer sends the report-only header (NFR-SEC-05, F5-01)", () => {
    for (const options of [PROD, DEV, PREVIEW]) {
      const headers = headerMap(options);

      expect(CSP_HEADER_NAME).toBe("Content-Security-Policy");
      expect(headers.get("Content-Security-Policy")).toBe(buildContentSecurityPolicy(options));
      expect(headers.has("Content-Security-Policy-Report-Only")).toBe(false);
    }
  });

  it("does not include HSTS preload", () => {
    expect(headerMap().get("Strict-Transport-Security")).not.toContain("preload");
  });
});

describe("buildContentSecurityPolicy", () => {
  it("blocks framing, plugins and foreign base/form targets", () => {
    const csp = buildContentSecurityPolicy(PROD);

    expect(directive(csp, "default-src")).toEqual(["'self'"]);
    expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(csp, "object-src")).toEqual(["'none'"]);
    expect(directive(csp, "base-uri")).toEqual(["'self'"]);
    expect(directive(csp, "form-action")).toEqual(["'self'"]);
  });

  it("allows Cloudflare Turnstile scripts and frames", () => {
    const csp = buildContentSecurityPolicy(PROD);

    expect(directive(csp, "script-src")).toContain("https://challenges.cloudflare.com");
    expect(directive(csp, "frame-src")).toEqual(["https://challenges.cloudflare.com"]);
  });

  it("in production allows only our own origin and Turnstile (no Supabase, no Vercel)", () => {
    const csp = buildContentSecurityPolicy(PROD);

    expect(directive(csp, "connect-src")).toEqual(["'self'"]);
    expect(directive(csp, "font-src")).toEqual(["'self'"]);
    expect(directive(csp, "img-src")).toEqual(["'self'", "data:", "blob:"]);
    expect(csp).not.toMatch(/supabase/i);
    expect(csp).not.toMatch(/vercel|pusher/i);
  });

  it("adds the Vercel Toolbar origins only when enabled (Preview)", () => {
    const csp = buildContentSecurityPolicy(PREVIEW);

    expect(directive(csp, "script-src")).toContain("https://vercel.live");
    expect(directive(csp, "style-src")).toContain("https://vercel.live");
    expect(directive(csp, "img-src")).toEqual(
      expect.arrayContaining(["https://vercel.live", "https://vercel.com"]),
    );
    expect(directive(csp, "font-src")).toEqual(
      expect.arrayContaining(["https://vercel.live", "https://assets.vercel.com"]),
    );
    expect(directive(csp, "connect-src")).toEqual(
      expect.arrayContaining(["https://vercel.live", "wss://ws-us3.pusher.com"]),
    );
    expect(directive(csp, "frame-src")).toEqual([
      "https://challenges.cloudflare.com",
      "https://vercel.live",
    ]);
    expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
    expect(csp).not.toMatch(/supabase/i);
  });

  it("adds 'unsafe-eval' only in development", () => {
    expect(directive(buildContentSecurityPolicy(DEV), "script-src")).toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy(PROD)).not.toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy(PREVIEW)).not.toContain("'unsafe-eval'");
  });

  it("produces a single-line header value", () => {
    expect(buildContentSecurityPolicy({ isDev: true, vercelToolbar: true })).not.toMatch(/[\r\n]/);
  });
});
