import { expect, test } from "@playwright/test";

test.describe("home on a small phone (US-01 CA1)", () => {
  // iPhone SE: one of the smallest common viewports.
  test.use({ viewport: { width: 375, height: 667 } });

  test("shows who the firm is, what it does and the CTA without scrolling", async ({ page }) => {
    await page.goto("/");
    const hero = page.getByRole("region", { name: /familia/i }).first();

    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    await expect(hero.getByText("Familia y sucesiones · CABA")).toBeInViewport();
    await expect(hero.getByRole("link", { name: "Contanos tu caso" })).toBeInViewport({
      ratio: 1,
    });
  });
});

for (const width of [360, 768, 1024, 1440]) {
  test(`home has no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
}

test.describe("home on desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("shows the area cards in rows of three and the professionals in the hero", async ({
    page,
  }) => {
    await page.goto("/");
    const cards = page.getByRole("region", { name: "¿En qué te podemos ayudar?" }).locator("li");
    const tops = await cards.evaluateAll((items) =>
      items.map((item) => Math.round(item.getBoundingClientRect().top)),
    );

    expect(new Set(tops.slice(0, 3)).size).toBe(1);
    expect(tops[3]).toBeGreaterThan(tops[0] ?? 0);
    await expect(
      page
        .getByRole("region", { name: /familia/i })
        .first()
        .getByText("Profesionales matriculados"),
    ).toBeVisible();
  });
});

test.describe("home sections", () => {
  test("area cards link to each area page (US-01 CA2)", async ({ page }) => {
    await page.goto("/");
    const areas = page.getByRole("region", { name: "¿En qué te podemos ayudar?" });

    await expect(areas.getByRole("link")).toHaveCount(5);
    await expect(areas.getByRole("link", { name: "Sucesiones" })).toHaveAttribute(
      "href",
      "/areas/sucesiones",
    );
  });

  test("a featured question opens and closes with the keyboard", async ({ page }) => {
    await page.goto("/");
    const details = page
      .getByRole("region", { name: "Preguntas frecuentes" })
      .locator("details")
      .first();
    const summary = details.locator("summary");

    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await page.keyboard.press("Enter");
    await expect(details).not.toHaveAttribute("open", "");
  });
});
