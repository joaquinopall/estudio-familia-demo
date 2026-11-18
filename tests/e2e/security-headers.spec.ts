import { expect, test } from "@playwright/test";

test.describe("security headers (NFR-SEC-04, NFR-SEC-05)", () => {
  test("home document response carries every security header", async ({ page }) => {
    const response = await page.goto("/");
    if (!response) throw new Error("no response for /");
    const headers = response.headers();

    expect(headers["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["content-security-policy-report-only"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toBeUndefined();
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("home page loads without report-only CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (text.includes("Content Security Policy") || text.includes("[Report Only]")) {
        violations.push(text);
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(violations).toEqual([]);
  });
});
