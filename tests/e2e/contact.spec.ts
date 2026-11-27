import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";

test.describe("contact page (FR-01, FR-13)", () => {
  for (const path of ["/contacto", "/contacto?area=sucesiones"]) {
    test(`${path} is served`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contacto");
    });
  }

  test("the header CTA leads to /contacto", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Contanos tu caso" }).click();

    await expect(page).toHaveURL(/\/contacto$/);
  });

  test("an area CTA leads to /contacto with the area", async ({ page }) => {
    await page.goto("/areas/alimentos");
    await page.getByRole("main").getByRole("link", { name: "Contanos tu caso" }).first().click();

    await expect(page).toHaveURL(/\/contacto\?area=alimentos$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contacto");
  });

  test("WhatsApp uses wa.me with a generic message (US-04)", async ({ page }) => {
    await page.goto("/contacto");
    const href = await page
      .getByRole("region", { name: "Datos de contacto" })
      .getByRole("link", { name: /Escribinos por WhatsApp/ })
      .getAttribute("href");

    expect(href).toMatch(/^https:\/\/wa\.me\/\d{8,15}\?text=/);
    expect(decodeURIComponent(href ?? "")).not.toMatch(/@/);
  });

  test("has no embedded map and no serious or critical axe violations", async ({ page }) => {
    await page.goto("/contacto");

    await expect(page.locator("iframe")).toHaveCount(0);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  /** axe with every impact; Turnstile's widget is Cloudflare's, not ours. */
  async function expectNoAxeViolations(page: Page, state: string) {
    const { violations } = await new AxeBuilder({ page })
      .exclude('[data-testid="turnstile"]')
      .analyze();
    expect(
      violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
      state,
    ).toEqual([]);
  }

  test("the form has no axe violations in any of its states (F5-03)", async ({ page }) => {
    await page.goto("/contacto");
    const form = page.locator("#formulario");

    await form.getByRole("button", { name: "Siguiente" }).click();
    await expect(form.getByRole("alert")).toBeVisible();
    await expectNoAxeViolations(page, "step 1 with errors");

    await form.getByLabel("¿Sobre qué es tu consulta?").selectOption("SUCCESSION");
    await form.getByLabel("Sin apuro").check();
    await form.getByLabel("Contanos tu caso").fill("Quiero saber cómo empezar una sucesión.");
    await form.getByRole("button", { name: "Siguiente" }).click();
    await expect(form.getByRole("heading", { name: /Tus datos/ })).toBeFocused();
    await expectNoAxeViolations(page, "step 2");

    await form.getByRole("button", { name: "Enviar consulta" }).click();
    await expect(form.getByRole("alert")).toBeVisible();
    await expectNoAxeViolations(page, "step 2 with errors");
  });

  test("loads Turnstile only when the person reaches step 2 (F5-03)", async ({ page }) => {
    const cloudflare: string[] = [];
    page.on("request", (request) => {
      if (request.url().startsWith("https://challenges.cloudflare.com/")) {
        cloudflare.push(request.url());
      }
    });
    await page.goto("/contacto");
    await page.waitForLoadState("networkidle");
    expect(cloudflare, "nothing from Cloudflare with the page").toEqual([]);

    const form = page.locator("#formulario");
    await form.getByLabel("¿Sobre qué es tu consulta?").selectOption("SUCCESSION");
    await form.getByLabel("Sin apuro").check();
    await form.getByLabel("Contanos tu caso").fill("Quiero saber cómo empezar una sucesión.");
    await form.getByRole("button", { name: "Siguiente" }).click();

    await expect.poll(() => cloudflare.length, { timeout: 15_000 }).toBeGreaterThan(0);
  });

  for (const width of [360, 1440]) {
    test(`has no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/contacto");

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  }
});
