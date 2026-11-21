import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AreaPage, {
  ensureStatic,
  generateMetadata,
  generateStaticParams,
} from "@/app/(public)/areas/[slug]/page";
import { areaPageContent } from "@/content/area-pages";
import { homeContent } from "@/content/home";
import { practiceAreas } from "@/content/practice-areas";

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

  it("returns no metadata for an unknown slug", async () => {
    expect(await generateMetadata(props("no-existe"))).toEqual({});
  });

  it.each(practiceAreas.map((area) => [area.slug, area.metadata] as const))(
    "%s has its own metadata (US-02 CA2)",
    async (slug, metadata) => {
      expect(await generateMetadata(props(slug))).toEqual({
        title: metadata.title,
        description: metadata.description,
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

    it("preselects the area in both calls to action", async () => {
      await renderArea(slug);

      const ctas = screen.getAllByRole("link", { name: "Contanos tu caso" });
      expect(ctas).toHaveLength(2);
      for (const cta of ctas) {
        expect(cta).toHaveAttribute("href", `/contacto?area=${slug}`);
      }
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
