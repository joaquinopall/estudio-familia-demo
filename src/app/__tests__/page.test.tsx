import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/(public)/page";
import { siteConfig } from "@/config/site.config";
import { getFeaturedFaqs } from "@/content/faqs";
import { homeContent } from "@/content/home";
import { practiceAreas } from "@/content/practice-areas";

describe("Home page (US-01)", () => {
  it("renders a single level-1 heading", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("has the sections of SPEC §11.3, in order", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      homeContent.areas.title,
      homeContent.trust.title,
      homeContent.process.title,
      homeContent.faqs.title,
      homeContent.finalCta.title,
    ]);
  });

  it("leads with the primary call to action and ends with it (CA1)", () => {
    render(<HomePage />);

    const ctas = screen.getAllByRole("link", { name: siteConfig.primaryCta.label });
    expect(ctas).toHaveLength(2);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute("href", siteConfig.primaryCta.href);
    }
  });

  it("links to every practice area page (CA2)", () => {
    render(<HomePage />);

    const section = screen.getByRole("region", { name: homeContent.areas.title });
    const links = within(section).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      practiceAreas.map((area) => `/areas/${area.slug}`),
    );
  });

  it("shows the professionals, the jurisdiction and the urgent phone in the hero", () => {
    render(<HomePage />);

    const hero = screen.getByRole("region", { name: homeContent.hero.title });
    for (const professional of siteConfig.professionals) {
      expect(within(hero).getByText(professional.registration)).toBeInTheDocument();
    }
    expect(within(hero).getByText(siteConfig.jurisdiction.note)).toBeInTheDocument();
    expect(hero).toHaveTextContent(`· ${siteConfig.jurisdiction.label}`);
    expect(
      within(hero).getByRole("link", { name: siteConfig.contact.phoneDisplay }),
    ).toHaveAttribute("href", `tel:+${siteConfig.contact.phoneE164}`);
  });

  it("shows the 3 process steps and the trust signals (CA3)", () => {
    render(<HomePage />);

    const process = screen.getByRole("region", { name: homeContent.process.title });
    expect(within(process).getAllByRole("listitem")).toHaveLength(3);

    const trust = screen.getByRole("region", { name: homeContent.trust.title });
    for (const professional of siteConfig.professionals) {
      expect(within(trust).getByText(professional.registration)).toBeInTheDocument();
    }
    expect(within(trust).getByText(siteConfig.confidentialityNote)).toBeInTheDocument();
  });

  it("shows the featured questions and links to all of them", () => {
    render(<HomePage />);

    const section = screen.getByRole("region", { name: homeContent.faqs.title });
    for (const faq of getFeaturedFaqs()) {
      expect(within(section).getByText(faq.question)).toBeInTheDocument();
    }
    expect(within(section).getByRole("link", { name: homeContent.faqs.linkLabel })).toHaveAttribute(
      "href",
      "/preguntas-frecuentes",
    );
  });
});
