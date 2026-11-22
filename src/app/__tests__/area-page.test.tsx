import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AreaPage, {
  ensureStatic,
  generateMetadata,
  generateStaticParams,
} from "@/app/(public)/areas/[slug]/page";
import { siteConfig } from "@/config/site.config";
import { areaPageContent } from "@/content/area-pages";
import { homeContent } from "@/content/home";
import { practiceAreas } from "@/content/practice-areas";
import { deadlineContent, safetyContent } from "@/content/urgent-help";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const props = (slug: string) => ({
  params: Promise.resolve({ slug }),
  searchParams: Promise.resolve({}),
});

async function renderArea(slug: string) {
  render(await AreaPage(props(slug)));
}

describe("/areas/[slug] static generation", () => {
  it("prerenders exactly the 5 practice areas", () => {
    expect(generateStaticParams()).toEqual(practiceAreas.map((area) => ({ slug: area.slug })));
  });

  it("waits for the complete render, so an unknown slug gets a real 404 (not 200 + noindex)", () => {
    // Without it, Cache Components streams the App Shell first and the status is already 200.
    expect(ensureStatic).toBe("navigation");
  });

  it("titles an unknown slug as a 404", async () => {
    expect(await generateMetadata(props("no-existe"))).toEqual({ title: "Página no encontrada" });
  });

  it.each(practiceAreas.map((area) => [area.slug, area.metadata] as const))(
    "%s has its own metadata (US-02 CA2)",
    async (slug, metadata) => {
      expect(await generateMetadata(props(slug))).toMatchObject({
        title: metadata.title,
        description: metadata.description,
        alternates: { canonical: `/areas/${slug}` },
        openGraph: { title: metadata.title, url: `/areas/${slug}` },
      });
    },
  );

  it("calls notFound for an unknown slug", async () => {
    await expect(AreaPage(props("no-existe"))).rejects.toThrow("NOT_FOUND");
  });
});

describe.each(practiceAreas.map((area) => [area.slug, area] as const))(
  "/areas/%s (US-02 CA1)",
  (slug, area) => {
    it("has a single h1 with the area title", async () => {
      await renderArea(slug);

      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(area.title);
    });

    it("has the sections of SPEC §11.3, in order", async () => {
      await renderArea(slug);

      expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
        areaPageContent.whenToConsultTitle,
        areaPageContent.documentsTitle,
        areaPageContent.faqsTitle,
        areaPageContent.otherAreasTitle,
        homeContent.finalCta.title,
      ]);
    });

    it("lists when to consult, the documents and every FAQ of the area", async () => {
      await renderArea(slug);

      for (const item of [...area.whenToConsult, ...area.documents]) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
      for (const faq of area.faqs) {
        expect(screen.getByText(faq.question)).toBeInTheDocument();
      }
    });

    it("puts the first CTA right after the first paragraph, and keeps the rest", async () => {
      await renderArea(slug);

      const [first, ...rest] = area.intro.map((paragraph) => screen.getByText(paragraph));
      const [cta] = screen.getAllByRole("link", { name: "Contanos tu caso" });
      const follows = (a?: Element, b?: Element) =>
        Boolean(a && b && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

      expect(follows(first, cta)).toBe(true);
      for (const paragraph of rest) expect(follows(cta, paragraph)).toBe(true);
    });

    it("preselects the area in both calls to action", async () => {
      await renderArea(slug);

      const ctas = screen.getAllByRole("link", { name: "Contanos tu caso" });
      expect(ctas).toHaveLength(2);
      for (const cta of ctas) {
        expect(cta).toHaveAttribute("href", `/contacto?area=${slug}`);
      }
    });

    it("says where the firm litigates and what to do with a deadline", async () => {
      await renderArea(slug);

      expect(screen.getByText(siteConfig.jurisdiction.note)).toBeInTheDocument();
      expect(screen.getByText(deadlineContent.title)).toBeInTheDocument();
    });

    it("shows the helplines only in family areas", async () => {
      await renderArea(slug);

      expect(screen.queryByText(safetyContent.title) !== null).toBe(area.showsSafetyNotice);
    });

    it("links to the other 4 areas, not to itself", async () => {
      await renderArea(slug);

      const nav = screen.getByRole("navigation", { name: areaPageContent.otherAreasTitle });
      const hrefs = within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href"));
      expect(hrefs).toHaveLength(4);
      expect(hrefs).not.toContain(`/areas/${slug}`);
    });

    it("marks the area as the current page in the breadcrumbs", async () => {
      await renderArea(slug);

      const breadcrumbs = screen.getByRole("navigation", { name: "Ruta" });
      expect(within(breadcrumbs).getByText(area.title)).toHaveAttribute("aria-current", "page");
    });
  },
);
