import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/nosotros", "/preguntas-frecuentes", "/privacidad"];

test.describe("institutional pages (FR-01, US-07 CA1)", () => {
  for (const path of PAGES) {
    test(`${path} is served without serious or critical axe violations`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });

    test(`${path} has no horizontal scroll at 360px`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(path);

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  }

  test("the footer links to the privacy policy (US-07 CA1)", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Política de privacidad" })
      .click();

    await expect(page).toHaveURL(/\/privacidad$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Política de privacidad");
  });

  test("the FAQ index jumps to the chosen group", async ({ page }) => {
    await page.goto("/preguntas-frecuentes");
    await page
      .getByRole("navigation", { name: "Temas" })
      .getByRole("link", { name: "Honorarios y costos" })
      .click();

    await expect(page).toHaveURL(/#fees$/);
    await expect(
      page.getByRole("heading", { level: 2, name: "Honorarios y costos" }),
    ).toBeInViewport();
  });

  test("the privacy index jumps to the rights section", async ({ page }) => {
    await page.goto("/privacidad");
    await page
      .getByRole("navigation", { name: "Contenido" })
      .getByRole("link", { name: "Tus derechos" })
      .click();

    await expect(page.getByRole("heading", { level: 2, name: "Tus derechos" })).toBeInViewport();
  });
});
