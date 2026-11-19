import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("public layout (F1-07)", () => {
  test("has lang es-AR and the shell elements", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
    await expect(page.getByRole("note", { name: "Aviso de demostración" })).toContainText(
      "Sitio de demostración — estudio ficticio",
    );
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText(
      "La información de este sitio es general y no constituye asesoramiento legal.",
    );
    await expect(page.getByRole("link", { name: /Escribinos por WhatsApp/ })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/\d+\?text=/,
    );
  });

  test("the first Tab focuses the skip link, which moves focus to main", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  test("has no serious or critical axe violations on desktop", async ({ page }) => {
    await page.goto("/");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe("public layout on mobile", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test("menu opens and closes with the keyboard", async ({ page }) => {
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: "Menú" });
    const mobileNav = page.getByRole("navigation", { name: "Principal (móvil)" });

    await expect(page.getByRole("navigation", { name: "Principal", exact: true })).toBeHidden();
    await menuButton.focus();
    await page.keyboard.press("Enter");
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(mobileNav).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(mobileNav).toBeHidden();
    await expect(menuButton).toBeFocused();
  });

  test("has no serious or critical axe violations with the menu open", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menú" }).click();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
