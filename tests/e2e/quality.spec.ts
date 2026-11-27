import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Visual and accessibility quality gates (F2-07, NFR-A11Y-01). Several of these cover what
 * axe cannot see: focus-indicator contrast, content hidden under the floating button and
 * what fits in the first screen of a phone.
 */

const AREAS = [
  "/areas/sucesiones",
  "/areas/divorcio",
  "/areas/alimentos",
  "/areas/cuidado-personal",
  "/areas/convenios-y-acuerdos",
];
const NOT_FOUND = ["/no-existe", "/areas/no-existe", "/areas/sucesiones/no-existe"];
const PAGES = [
  "/",
  "/areas",
  ...AREAS,
  "/nosotros",
  "/preguntas-frecuentes",
  "/contacto",
  "/privacidad",
  ...NOT_FOUND,
];

test.use({ contextOptions: { reducedMotion: "reduce" } });

/** Fully on screen and with nothing on top of any of its visible text or its box. */
async function expectVisibleAndUncovered(locator: Locator) {
  await expect(locator).toBeInViewport({ ratio: 1 });

  const covered = await locator.evaluate((element) => {
    // Text rects, not the block box: a paragraph's box can be wider than its text.
    // Screen-reader-only text is skipped: it is clipped, so there is nothing to cover.
    const rects: DOMRect[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.closest(".sr-only")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      rects.push(...range.getClientRects());
    }
    return rects.some((rect) =>
      [0.02, 0.25, 0.5, 0.75, 0.98].some((fraction) => {
        const top = document.elementFromPoint(
          rect.left + rect.width * fraction,
          rect.top + rect.height / 2,
        );
        return !top || !element.contains(top);
      }),
    );
  });
  expect(covered, "something is covering the element").toBe(false);
}

type FocusStop = { label: string; ratio: number };

/** Contrast of the focused element's outline against what is painted behind it. */
async function readFocusStop(page: Page): Promise<FocusStop | null> {
  return page.evaluate(async () => {
    // With reduced motion every property has a 0.01ms transition: reading right away returns
    // the color from before focus. Under load it can take more than two frames, so also wait
    // for the transitions themselves.
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    await nextFrame();
    await nextFrame();
    await Promise.allSettled(
      document
        .getAnimations()
        .filter((animation) => animation instanceof CSSTransition)
        .map((animation) => animation.finished),
    );
    await nextFrame();
    const focused = document.activeElement;
    if (!focused || focused === document.body) return null;

    // Area cards draw the outline on the whole <article>.
    const target =
      getComputedStyle(focused).outlineStyle === "none"
        ? (focused.closest("article") ?? focused)
        : focused;
    const style = getComputedStyle(target);
    const label = (focused.getAttribute("aria-label") ?? focused.textContent ?? "").trim();
    if (style.outlineStyle === "none") return { label, ratio: 0 };

    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!context) return { label, ratio: 0 };

    const behind: Element[] = [];
    if (style.position === "fixed") {
      const rect = target.getBoundingClientRect();
      behind.push(...document.elementsFromPoint(rect.left - 2, rect.top + rect.height / 2));
    } else {
      for (let node = target.parentElement; node; node = node.parentElement) behind.push(node);
    }

    // Paint from the back to the front so translucent backgrounds are composited.
    const paint = (color: string) => {
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
    };
    const luminance = () => {
      const [r = 0, g = 0, b = 0] = [...context.getImageData(0, 0, 1, 1).data]
        .slice(0, 3)
        .map((value) => value / 255)
        .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    paint("#ffffff");
    for (const node of behind.reverse()) paint(getComputedStyle(node).backgroundColor);
    const background = luminance();
    paint(style.outlineColor);
    const outline = luminance();

    const ratio = (Math.max(outline, background) + 0.05) / (Math.min(outline, background) + 0.05);
    return { label, ratio };
  });
}

for (const width of [360, 1440]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const path of PAGES) {
      test(`${path} has no axe violations of any impact`, async ({ page }) => {
        await page.goto(path);
        // The 404 of an unknown area is rendered on the client: analyze the page, not
        // Next's empty placeholder (#__next_error__) that comes before it.
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

        const { violations } = await new AxeBuilder({ page }).analyze();
        expect(
          violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
        ).toEqual([]);
      });

      test(`${path} shows a 3:1 focus indicator at every Tab stop`, async ({ page }) => {
        await page.goto(path);
        // notFound() inside /areas/[slug] answers a 404 whose HTML is rendered on the client
        // (known Next limitation, ADR-0009): there is nothing to focus until the h1 appears.
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

        const weak: string[] = [];
        let stops = 0;
        for (; stops < 100; stops++) {
          await page.keyboard.press("Tab");
          const stop = await readFocusStop(page);
          if (!stop) break;
          if (stop.ratio < 3) weak.push(`${stop.label} (${stop.ratio.toFixed(2)}:1)`);
        }

        expect(stops, "nothing to focus").toBeGreaterThan(3);
        expect(weak).toEqual([]);
      });
    }
  });
}

for (const width of [320, 360, 375]) {
  test.describe(`first screen at ${width}x667`, () => {
    test.use({ viewport: { width, height: 667 } });

    test("home shows confidentiality and the CTA, uncovered (US-01 CA1)", async ({ page }) => {
      await page.goto("/");
      const hero = page.locator('section[aria-labelledby="hero-title"]');

      await expectVisibleAndUncovered(
        hero.getByText("La primera conversación es confidencial.", { exact: true }),
      );
      await expectVisibleAndUncovered(hero.getByRole("link", { name: "Contanos tu caso" }));
    });

    for (const path of AREAS) {
      test(`${path} shows its CTA, uncovered`, async ({ page }) => {
        await page.goto(path);
        const header = page.locator('section[aria-labelledby="area-title"]');

        await expectVisibleAndUncovered(header.getByRole("link", { name: "Contanos tu caso" }));
      });
    }
  });
}

// The shortest common screens, with the demo banner on.
for (const [width, height] of [
  [320, 568],
  [360, 640],
  [1024, 768],
  [1280, 720],
  [1366, 768],
] as const) {
  test.describe(`main action at ${width}x${height}`, () => {
    test.use({ viewport: { width, height } });

    for (const path of ["/", "/nosotros", ...AREAS]) {
      test(`${path} shows it without scrolling`, async ({ page }) => {
        await page.goto(path);

        await expectVisibleAndUncovered(
          page.getByRole("main").getByRole("link", { name: "Contanos tu caso" }).first(),
        );
      });
    }

    // Since F3-07 the form goes first on /contacto (where every "Contanos tu caso" leads), and
    // a channel that works is still one tap away: WhatsApp in the header (US-04 CA1).
    test("/contacto shows the start of the form and WhatsApp without scrolling", async ({
      page,
    }) => {
      await page.goto("/contacto");

      await expectVisibleAndUncovered(
        page.getByRole("main").getByRole("heading", { name: "Contanos tu caso" }),
      );
      if (width < 1380) {
        await expectVisibleAndUncovered(
          page
            .getByRole("banner")
            .getByRole("link", { name: /WhatsApp/ })
            .first(),
        );
      }
    });
  });
}

// 1379/1380 are both sides of the gutter breakpoint (src/app/globals.css).
for (const width of [320, 390, 768, 1024, 1151, 1152, 1280, 1366, 1379, 1380, 1440]) {
  test.describe(`header and WhatsApp at ${width}px`, () => {
    test.use({ viewport: { width, height: 720 } });

    test("nothing floats over the content, and WhatsApp is always on screen", async ({ page }) => {
      for (const path of ["/", "/preguntas-frecuentes", "/contacto", "/areas/divorcio"]) {
        await page.goto(path);
        await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));

        const link = page
          .locator('header a[href*="wa.me"], body > aside a[href*="wa.me"]')
          .filter({ visible: true });
        await expect(link).toHaveCount(1);
        await expect(link).toBeInViewport({ ratio: 1 });

        const gap = await page.evaluate(() => {
          const floating = document.querySelector('body > aside a[href*="wa.me"]');
          if (!floating?.checkVisibility()) return null;
          const content = document.querySelectorAll(
            "main p, main li, main summary, main h2, footer p, footer a, footer li",
          );
          const edge = Math.max(
            ...[...content]
              .filter((element) => element.checkVisibility())
              .map((element) => element.getBoundingClientRect().right),
          );
          return floating.getBoundingClientRect().left - edge;
        });
        // 8.5px: half of a classic 17px scrollbar, which headless Chromium does not draw.
        if (gap !== null) expect(gap, path).toBeGreaterThanOrEqual(8.5);
      }
    });

    test("the header fits in one line", async ({ page }) => {
      await page.goto("/areas/divorcio");
      const header = page.getByRole("banner");

      const height = await header.evaluate((element) => element.getBoundingClientRect().height);
      expect(height).toBeLessThanOrEqual(width < 640 ? 64 : 76);
      const tall = await header
        .getByRole("link")
        .evaluateAll((links) =>
          links
            .filter((element) => element.getBoundingClientRect().height > 50)
            .map((element) => element.textContent),
        );
      expect(tall).toEqual([]);
    });
  });
}

for (const [width, height] of [
  [390, 640],
  [1152, 600],
] as const) {
  test.describe(`focus under the sticky header at ${width}px`, () => {
    test.use({ viewport: { width, height } });

    for (const path of ["/", "/areas/divorcio", "/preguntas-frecuentes", "/privacidad"]) {
      test(`${path}: tabbing backwards never hides the focused element`, async ({ page }) => {
        await page.goto(path);
        await page.getByRole("contentinfo").getByRole("link").last().focus();

        const hidden: string[] = [];
        for (let i = 0; i < 80; i++) {
          await page.keyboard.press("Shift+Tab");
          const state = await page.evaluate(async () => {
            await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
            const focused = document.activeElement;
            if (!focused || focused === document.body || focused.closest("header")) return null;
            const header = document.querySelector("header")!.getBoundingClientRect();
            const box = focused.getBoundingClientRect();
            return { label: focused.textContent, hidden: box.top < header.bottom - 1 };
          });
          if (!state) break;
          if (state.hidden) hidden.push(state.label ?? "");
        }
        expect(hidden).toEqual([]);
      });
    }
  });
}

test.describe("open mobile menu", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of ["/", "/areas", "/contacto"]) {
    test(`${path}: closes when tabbing out, so it never covers the focus`, async ({ page }) => {
      await page.goto(path);
      const button = page.getByRole("button", { name: "Menú" });
      await button.click();
      await expect(button).toHaveAttribute("aria-expanded", "true");

      const nav = page.getByRole("navigation", { name: "Principal (móvil)" });
      await nav.getByRole("link").last().focus();
      await page.keyboard.press("Tab");

      await expect(button).toHaveAttribute("aria-expanded", "false");
    });
  }

  test("closes when tapping outside", async ({ page }) => {
    await page.goto("/areas");
    const button = page.getByRole("button", { name: "Menú" });
    await button.click();
    await page.mouse.click(10, 800);

    await expect(button).toHaveAttribute("aria-expanded", "false");
  });
});

for (const path of PAGES) {
  test(`${path} fits in 305px: a 320px window minus a classic scrollbar`, async ({ page }) => {
    await page.setViewportSize({ width: 305, height: 640 });
    await page.goto(path);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

// The browser's default font at 125% (20px) and 150% (24px, F5-03): a phone's "large text".
// Media queries in rem follow it; page zoom is another case. 200% is checked from 768px only:
// on a phone, WCAG 1.4.4 is met with the browser zoom, covered by the 320px reflow test.
const LARGE_FONTS = [
  { percent: 125, standard: 20, widths: [320, 360, 375, 390, 412, 768, 1024, 1280, 1440] },
  { percent: 150, standard: 24, widths: [320, 360, 375, 390, 412, 768, 1024, 1280, 1440] },
  { percent: 200, standard: 32, widths: [768, 1024, 1280, 1440] },
] as const;

for (const { percent, standard, widths } of LARGE_FONTS) {
  for (const width of widths) {
    test(`nothing overflows at ${width}px with the browser font at ${percent}%`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      const session = await page.context().newCDPSession(page);
      await session.send("Page.enable");
      await session.send("Page.setFontSizes", { fontSizes: { standard } });

      const overflowing: string[] = [];
      for (const path of PAGES) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const { root, overflow } = await page.evaluate(() => ({
          root: getComputedStyle(document.documentElement).fontSize,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        // html is 106.25% of the browser font (globals.css).
        expect(root, `the ${percent}% font was not applied`).toBe(`${standard * 1.0625}px`);
        if (overflow > 0) overflowing.push(`${path} (${overflow}px)`);
      }
      expect(overflowing).toEqual([]);
    });
  }
}

// A sticky index taller than the window cuts its last links, and scrolling the page cannot reveal them.
for (const [width, height] of [
  [1152, 600],
  [1280, 650],
  [1440, 560],
] as const) {
  test(`the last link of the sticky index is reachable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/privacidad");
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));

    const last = page.getByRole("navigation", { name: "Contenido" }).getByRole("link").last();
    await last.focus();

    await expectVisibleAndUncovered(last);
  });
}

test("focusing the sticky header does not move the page", async ({ page }) => {
  await page.setViewportSize({ width: 1152, height: 640 });
  await page.goto("/preguntas-frecuentes");
  await page.evaluate(() => window.scrollTo({ top: 1000, behavior: "instant" }));

  await page.locator('header a[href*="wa.me"]').focus();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

  expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(1000);
});

test("the navigation marks the current section", async ({ page }) => {
  await page.goto("/areas/divorcio");
  const current = page.getByRole("banner").locator("[aria-current]").filter({ visible: true });

  await expect(current).toHaveText("Áreas de práctica");
});

test.describe("small screens", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const path of PAGES) {
    test(`${path} reflows at 320px without horizontal scroll (WCAG 1.4.10)`, async ({ page }) => {
      await page.goto(path);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  for (const path of ["/", "/contacto", "/privacidad", "/preguntas-frecuentes", ...AREAS]) {
    test(`${path} has 44px targets for contact, help, breadcrumb and index links`, async ({
      page,
    }) => {
      await page.goto(path);
      const links = page.locator(
        'footer a, section[aria-labelledby="contact-details-title"] a, #responsable a, main a[href^="tel:"], nav[aria-label="Ruta"] a, nav[aria-label="Temas"] a, nav[aria-label="Contenido"] a',
      );

      const small = await links.evaluateAll((elements) =>
        elements
          .filter((element) => element.getBoundingClientRect().height < 44)
          .map((element) => element.textContent),
      );
      expect(small).toEqual([]);
    });
  }

  for (const width of [320, 768, 1024, 1280, 1379, 1380, 1440]) {
    test(`the floating button does not cover the privacy link at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 640 });
      await page.goto("/");
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

      await expectVisibleAndUncovered(
        page.getByRole("contentinfo").getByRole("link", { name: "Política de privacidad" }),
      );
    });
  }

  test("the demo banner keeps only the FR-15 text on phones", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("note", { name: "Aviso de demostración" });

    await expect(banner.getByText("Sitio de demostración — estudio ficticio.")).toBeVisible();
    await expect(banner.getByText(/no son reales/)).toBeHidden();
  });
});

test.describe("friendly 404 (FR-16)", () => {
  for (const path of NOT_FOUND) {
    test(`${path} answers 404 in Spanish, with the shell and a way out`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(/Página no encontrada/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "No encontramos esta página",
      );
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();

      const main = page.getByRole("main");
      await expect(main.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute(
        "href",
        "/",
      );
      await expect(main.getByRole("link", { name: "Ir a contacto" })).toHaveAttribute(
        "href",
        "/contacto",
      );
    });
  }
});
