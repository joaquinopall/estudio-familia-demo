import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AreasPage, { metadata } from "@/app/(public)/areas/page";
import { siteConfig } from "@/config/site.config";
import { areasIndexContent } from "@/content/area-pages";
import { practiceAreas } from "@/content/practice-areas";

describe("/areas (FR-01)", () => {
  it("has its own metadata", () => {
    expect(metadata).toEqual(areasIndexContent.metadata);
  });

  it("has a single h1", () => {
    render(<AreasPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(areasIndexContent.title);
  });

  it("links to every practice area page", () => {
    render(<AreasPage />);

    const cards = screen.getAllByRole("article");
    expect(cards.map((card) => within(card).getByRole("link").getAttribute("href"))).toEqual(
      practiceAreas.map((area) => `/areas/${area.slug}`),
    );
  });

  it("offers the primary call to action for topics outside the list", () => {
    render(<AreasPage />);

    const section = screen.getByRole("region", { name: areasIndexContent.otherTopic.title });
    expect(
      within(section).getByRole("link", { name: siteConfig.primaryCta.label }),
    ).toHaveAttribute("href", siteConfig.primaryCta.href);
  });

  it("marks /areas as the current page in the breadcrumbs", () => {
    render(<AreasPage />);

    const breadcrumbs = screen.getByRole("navigation", { name: "Ruta" });
    expect(within(breadcrumbs).getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(within(breadcrumbs).getByText("Áreas de práctica")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
