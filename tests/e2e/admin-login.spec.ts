/**
 * Admin login page (F4-03, US-06 CA1, SPEC §6.4, §6.5, NFR-A11Y-01).
 *
 * The wrong-credentials scenario really asks Supabase dev (with an account that does not
 * exist) and counts one attempt in the login rate limit, under a documentation IP of its own.
 * A successful login needs a test account with a password: that is F4-07.
 */
import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";

import { adminPanelContent } from "../../src/content/admin-panel";

const copy = adminPanelContent;
const RUN = randomUUID().slice(0, 8);
/** A documentation IPv6 per run, so the e2e never spend your own rate limit (5 every 15 min). */
const CLIENT_IP = `2001:db8:${RUN.slice(0, 4)}:${RUN.slice(4, 8)}::4f3`;

function collectCspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("Content Security Policy") || text.includes("[Report Only]")) {
      violations.push(text);
    }
  });
  return violations;
}

test.describe("admin login page", () => {
  test("lands there from /admin, out of any index, accessible and without CSP violations", async ({
    page,
  }) => {
    const violations = collectCspViolations(page);

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { level: 1, name: copy.login.title })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex.*nofollow/,
    );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
    ).toEqual([]);
    expect(violations).toEqual([]);
  });

  test("works with the keyboard: email, password, then the button", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(copy.login.email).focus();

    await page.keyboard.press("Tab");
    await expect(page.getByLabel(copy.login.password)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: copy.login.submit })).toBeFocused();
  });

  test("wrong credentials: generic message, focused, and the email is kept", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": CLIENT_IP });
    await page.goto("/admin/login");

    await page.getByLabel(copy.login.email).fill(`e2e-${RUN}@example.com`);
    await page.getByLabel(copy.login.password).fill("una-clave-que-no-existe");
    await page.getByRole("button", { name: copy.login.submit }).click();

    // Inside <main>: Next adds its own role="alert" route announcer outside it.
    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toHaveText("El email o la contraseña no son correctos.");
    await expect(alert).toBeFocused();
    await expect(page.getByLabel(copy.login.email)).toHaveValue(`e2e-${RUN}@example.com`);
    await expect(page.getByLabel(copy.login.password)).toHaveValue("");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("?error=forbidden explains it and offers another account", async ({ page }) => {
    await page.goto("/admin/login?error=forbidden");

    await expect(page.getByRole("heading", { name: copy.forbidden.title })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.forbidden.switchAccount })).toBeVisible();
  });
});
