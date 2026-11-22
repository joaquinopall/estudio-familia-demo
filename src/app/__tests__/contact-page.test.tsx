import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ContactPage, { metadata } from "@/app/(public)/contacto/page";
import { siteConfig } from "@/config/site.config";
import { contactPageContent } from "@/content/contact-page";
import { getFeaturedFaqs } from "@/content/faqs";

describe("/contacto (FR-01, SPEC §11.3)", () => {
  it("has its own metadata", () => {
    expect(metadata).toMatchObject({
      ...contactPageContent.metadata,
      alternates: { canonical: "/contacto" },
    });
  });

  it("has a single h1 and marks itself as the current page", () => {
    render(<ContactPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Contacto");
    const breadcrumbs = screen.getByRole("navigation", { name: "Ruta" });
    expect(within(breadcrumbs).getByText("Contacto")).toHaveAttribute("aria-current", "page");
  });

  it("states the expected response time up front", () => {
    render(<ContactPage />);

    const header = screen.getByRole("region", { name: "Contacto" });
    expect(within(header).getByText(siteConfig.responseTime)).toBeInTheDocument();
  });

  it("reserves the place of the inquiry form (#formulario) for F3", () => {
    const { container } = render(<ContactPage />);

    const slot = container.querySelector("#formulario");
    expect(slot).not.toBeNull();
    expect(slot).toHaveTextContent(contactPageContent.formSlot.title);
    expect(slot).toHaveTextContent(contactPageContent.formSlot.notice);
  });

  it("shows the contact details and the featured questions", () => {
    render(<ContactPage />);

    expect(
      screen.getByRole("region", { name: contactPageContent.details.title }),
    ).toBeInTheDocument();
    const faqs = screen.getByRole("region", { name: contactPageContent.faqs.title });
    for (const faq of getFeaturedFaqs()) {
      expect(within(faqs).getByText(faq.question)).toBeInTheDocument();
    }
    expect(
      within(faqs).getByRole("link", { name: contactPageContent.faqs.linkLabel }),
    ).toHaveAttribute("href", "/preguntas-frecuentes");
  });
});
