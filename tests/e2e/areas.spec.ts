import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SLUGS = ["sucesiones", "divorcio", "alimentos", "cuidado-personal", "convenios-y-acuerdos"];

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );

  expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test.describe("practice areas (FR-01, US-02)", () => {
  test("a home card leads to its area page", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("region", { name: "¿En qué te podemos ayudar?" })
      .getByRole("link", { name: "Sucesiones" })
      .click();

    await expect(page).toHaveURL(/\/areas\/sucesiones$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sucesiones");
  });

  for (const slug of SLUGS) {
    test(`/areas/${slug} is served and preselects the area in the CTA`, async ({ page }) => {
      const response = await page.goto(`/areas/${slug}`);

      expect(response?.status()).toBe(200);
      await expect(page.getByRole("link", { name: "Contanos tu caso" }).last()).toHaveAttribute(
        "href",
        `/contacto?area=${slug}`,
      );
    });
  }

  test("an unknown area returns 404", async ({ page }) => {
    const response = await page.goto("/areas/no-existe");

    expect(response?.status()).toBe(404);
  });

  test("/areas lists the 5 areas", async ({ page }) => {
    const response = await page.goto("/areas");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("main").getByRole("article")).toHaveCount(5);
  });

  test("/areas has no serious or critical axe violations", async ({ page }) => {
    await page.goto("/areas");
    await expectNoSeriousAxeViolations(page);
  });

  test("an area page has no serious or critical axe violations", async ({ page }) => {
    await page.goto("/areas/sucesiones");
    await page.locator("details").first().locator("summary").click();
    await expectNoSeriousAxeViolations(page);
  });

  for (const width of [360, 1440]) {
    test(`an area page has no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/areas/cuidado-personal");

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  }
});
