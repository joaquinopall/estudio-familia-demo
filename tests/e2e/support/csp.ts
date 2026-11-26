/**
 * Collects Content Security Policy violations of a page (NFR-SEC-05, F5-01, ADR-0016).
 *
 * Two sources, because each one misses cases: the `securitypolicyviolation` DOM event (exact
 * directive and blocked URL, any browser) and the console, where Chromium also reports what the
 * event does not reach (e.g. a blocked frame). Call it before the first `page.goto`.
 */
import type { Page } from "@playwright/test";

export async function collectCspViolations(page: Page): Promise<string[]> {
  const violations: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("Content Security Policy")) violations.push(`console: ${text}`);
  });

  await page.exposeFunction("__reportCspViolation", (text: string) => {
    violations.push(`event: ${text}`);
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      const report = (window as unknown as { __reportCspViolation: (text: string) => void })
        .__reportCspViolation;
      report(`${event.effectiveDirective} blocked ${event.blockedURI || "(inline)"}`);
    });
  });

  return violations;
}
