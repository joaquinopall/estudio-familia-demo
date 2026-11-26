/**
 * Security headers (NFR-SEC-04) and the enforced CSP (NFR-SEC-05, F5-01, ADR-0016): every page
 * a visitor can reach renders without a single violation. The form with Turnstile is covered by
 * inquiry-submit.spec.ts and the signed-in panel by admin-panel.spec.ts.
 */
import { expect, test } from "@playwright/test";

import { getPublicPaths } from "../../src/lib/seo/routes";
import { collectCspViolations } from "./support/csp";

test.describe("security headers (NFR-SEC-04, NFR-SEC-05)", () => {
  test("home document response carries every security header and the enforced CSP", async ({
    page,
  }) => {
    const response = await page.goto("/");
    if (!response) throw new Error("no response for /");
    const headers = response.headers();

    expect(headers["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy-report-only"]).toBeUndefined();
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  // Every public page, a missing one (404) and the admin login.
  const paths = [...getPublicPaths(), "/no-existe", "/admin/login"];

  for (const path of paths) {
    test(`${path} loads without CSP violations`, async ({ page }) => {
      const violations = await collectCspViolations(page);

      const response = await page.goto(path);
      expect(response?.headers()["content-security-policy"]).toBeDefined();
      await page.waitForLoadState("networkidle");

      expect(violations).toEqual([]);
    });
  }
});
