import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ContactPage, { metadata } from "@/app/(public)/contacto/page";
import { siteConfig } from "@/config/site.config";
import { contactPageContent } from "@/content/contact-page";
import { getFeaturedFaqs } from "@/content/faqs";
import { inquiryFormContent } from "@/content/inquiry-form";
import { deadlineContent, safetyContent } from "@/content/urgent-help";

vi.mock("@/features/inquiries/actions", () => ({ submitInquiry: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));

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

  it("puts the working form first and keeps the contact details with the response time (F3-07)", () => {
    render(<ContactPage />);

    const form = screen.getByRole("region", { name: inquiryFormContent.title });
    const details = screen.getByRole("region", { name: contactPageContent.details.title });
    expect(form.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(details).getByText(siteConfig.responseTime)).toBeInTheDocument();
  });

  it("shows the helplines and the way out for deadlines", () => {
    render(<ContactPage />);

    expect(screen.getByText(safetyContent.title)).toBeInTheDocument();
    expect(screen.getByText(deadlineContent.title)).toBeInTheDocument();
  });

  it("renders the inquiry form at #formulario, where the CTAs of the site lead", () => {
    const { container } = render(<ContactPage />);

    const section = container.querySelector("#formulario");
    expect(section).not.toBeNull();
    expect(section?.querySelector("form")).not.toBeNull();
    expect(section).toHaveTextContent(inquiryFormContent.title);
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
