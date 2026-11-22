import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AboutPage, { metadata as aboutMetadata } from "@/app/(public)/nosotros/page";
import FaqPage, { metadata as faqMetadata } from "@/app/(public)/preguntas-frecuentes/page";
import PrivacyPage, { metadata as privacyMetadata } from "@/app/(public)/privacidad/page";
import { siteConfig } from "@/config/site.config";
import { aboutContent } from "@/content/about";
import { faqPageContent } from "@/content/faq-page";
import { getFaqsByGroup } from "@/content/faqs";
import { privacyPolicy } from "@/content/legal/privacy";
import { practiceAreas } from "@/content/practice-areas";

describe.each([
  ["/nosotros", AboutPage, aboutMetadata, aboutContent],
  ["/preguntas-frecuentes", FaqPage, faqMetadata, faqPageContent],
  ["/privacidad", PrivacyPage, privacyMetadata, privacyPolicy],
] as const)("%s", (path, Page, metadata, content) => {
  it("has its own metadata with canonical", () => {
    expect(metadata).toMatchObject({ ...content.metadata, alternates: { canonical: path } });
  });

  it("has a single h1 and marks itself as the current page", () => {
    render(<Page />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(content.title);
    const breadcrumbs = screen.getByRole("navigation", { name: "Ruta" });
    expect(within(breadcrumbs).getByText(content.title)).toHaveAttribute("aria-current", "page");
    expect(content.breadcrumbs.at(-1)?.href).toBe(path);
  });
});

describe("/nosotros (SPEC §11.3)", () => {
  it("shows every professional with registration and education", () => {
    render(<AboutPage />);

    const section = screen.getByRole("region", { name: aboutContent.professionals.title });
    for (const professional of siteConfig.professionals) {
      expect(within(section).getByRole("heading", { name: professional.name })).toBeInTheDocument();
      expect(within(section).getByText(professional.registration)).toBeInTheDocument();
      expect(within(section).getByText(professional.education)).toBeInTheDocument();
    }
  });

  it("offers the call to action in the header, not only at the end", () => {
    render(<AboutPage />);

    const header = screen.getByRole("region", { name: aboutContent.title });
    expect(within(header).getByRole("link", { name: siteConfig.primaryCta.label })).toHaveAttribute(
      "href",
      siteConfig.primaryCta.href,
    );
  });

  it("shows the approach and the values", () => {
    render(<AboutPage />);

    expect(screen.getByRole("region", { name: aboutContent.approach.title })).toBeInTheDocument();
    for (const value of aboutContent.values.items) {
      expect(screen.getByRole("heading", { name: value.title })).toBeInTheDocument();
    }
  });
});

describe("/preguntas-frecuentes (SPEC §11.3)", () => {
  it("shows every group with its questions, each reachable from the index", () => {
    const { container } = render(<FaqPage />);

    const toc = screen.getByRole("navigation", { name: faqPageContent.tocLabel });
    for (const group of getFaqsByGroup()) {
      const link = within(toc).getByRole("link", { name: group.title });
      expect(link).toHaveAttribute("href", `#${group.id}`);
      const section = container.querySelector(`#${group.id}`);
      expect(section).not.toBeNull();
      for (const faq of group.faqs) {
        expect(section).toHaveTextContent(faq.question);
      }
    }
  });

  it("links to every practice area for area-specific questions", () => {
    render(<FaqPage />);

    const section = screen.getByRole("region", { name: faqPageContent.areas.title });
    const hrefs = within(section)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(practiceAreas.map((area) => `/areas/${area.slug}`));
  });
});

describe("/privacidad (US-07 CA1)", () => {
  it("shows the version and the effective date", () => {
    const { container } = render(<PrivacyPage />);

    expect(screen.getByText(new RegExp(`Versión ${privacyPolicy.version}`))).toBeInTheDocument();
    expect(container.querySelector("time")).toHaveAttribute(
      "datetime",
      privacyPolicy.effectiveDate,
    );
  });

  it("indexes every section", () => {
    const { container } = render(<PrivacyPage />);

    const toc = screen.getByRole("navigation", { name: privacyPolicy.tocLabel });
    expect(within(toc).getAllByRole("link")).toHaveLength(privacyPolicy.sections.length);
    for (const section of privacyPolicy.sections) {
      expect(container.querySelector(`#${section.id}`)).not.toBeNull();
    }
  });

  it("identifies the controller with the firm data from site.config (FR-03)", () => {
    const { container } = render(<PrivacyPage />);

    const controller = container.querySelector(`#${privacyPolicy.controllerId}`);
    expect(controller).toHaveTextContent(siteConfig.name);
    expect(controller).toHaveTextContent(siteConfig.address.street);
    expect(controller).toHaveTextContent(siteConfig.contact.email);
  });

  it.runIf(siteConfig.isFictitious)("warns that the firm is fictitious", () => {
    render(<PrivacyPage />);

    expect(screen.getByText(privacyPolicy.demoNotice)).toBeInTheDocument();
  });
});
