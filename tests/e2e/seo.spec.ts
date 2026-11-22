import { expect, test, type Page } from "@playwright/test";

type JsonLdNode = { "@type": string; [key: string]: unknown };

async function readJsonLd(page: Page): Promise<JsonLdNode[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((text) => {
    const parsed = JSON.parse(text) as JsonLdNode | JsonLdNode[];
    return Array.isArray(parsed) ? parsed : [parsed];
  });
}

const types = (nodes: JsonLdNode[]) => nodes.map((node) => node["@type"]);

test.describe("technical SEO (FR-14, NFR-SEO-01)", () => {
  test("sitemap.xml lists the public pages and not the admin", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    const body = await response.text();

    expect(response.status()).toBe(200);
    expect(body).toContain("/areas/sucesiones</loc>");
    expect(body).toContain("/privacidad</loc>");
    expect(body).not.toContain("/admin");
  });

  test("robots.txt blocks /admin and points to the sitemap", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();

    expect(body).toMatch(/Disallow: \/admin/);
    expect(body).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });

  test("the Open Graph image is served as PNG", async ({ request }) => {
    const response = await request.get("/opengraph-image");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  });

  test("the home has canonical, Open Graph, LegalService and noindex in demo mode", async ({
    page,
  }) => {
    await page.goto("/");

    // Next serializes the canonical of "/" as the bare origin (trailing slash optional).
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /^https?:\/\/[^/]+\/?$/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /.+/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /opengraph-image/,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex, nofollow/,
    );
    expect(types(await readJsonLd(page))).toContain("LegalService");
  });

  test("an area page has its own canonical, Service and BreadcrumbList (US-02 CA2)", async ({
    page,
  }) => {
    await page.goto("/areas/sucesiones");

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/areas\/sucesiones$/,
    );
    expect(types(await readJsonLd(page))).toEqual(
      expect.arrayContaining(["LegalService", "Service", "BreadcrumbList"]),
    );
  });

  for (const path of [
    "/",
    "/areas",
    "/areas/divorcio",
    "/nosotros",
    "/preguntas-frecuentes",
    "/contacto",
    "/privacidad",
  ]) {
    test(`${path} has a working og:image`, async ({ page, request }) => {
      await page.goto(path);
      const image = page.locator('meta[property="og:image"]').first();
      await expect(image).toHaveAttribute("content", /opengraph-image/);

      // Absolute URL built from NEXT_PUBLIC_SITE_URL: check the path on the server under test.
      const { pathname } = new URL((await image.getAttribute("content")) ?? "");
      expect((await request.get(pathname)).status()).toBe(200);
    });
  }

  test("the FAQ page has FAQPage with every general question", async ({ page }) => {
    await page.goto("/preguntas-frecuentes");

    const faqPage = (await readJsonLd(page)).find((node) => node["@type"] === "FAQPage");
    expect(faqPage).toBeDefined();
    expect((faqPage?.mainEntity as unknown[]).length).toBeGreaterThanOrEqual(8);
  });
});
