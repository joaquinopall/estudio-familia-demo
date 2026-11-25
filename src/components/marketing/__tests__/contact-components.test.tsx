import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContactDetails } from "@/components/marketing/contact-details";
import { siteConfig } from "@/config/site.config";
import { contactPageContent } from "@/content/contact-page";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const labels = contactPageContent.details;

function renderDetails() {
  render(
    <ContactDetails
      contact={siteConfig.contact}
      address={siteConfig.address}
      hours={siteConfig.hours}
      confidentialityNote={siteConfig.confidentialityNote}
      responseTime={siteConfig.responseTime}
      labels={labels}
    />,
  );
}

describe("ContactDetails", () => {
  it("links to WhatsApp with the generic message, in a new tab (FR-13, US-04)", () => {
    renderDetails();

    const link = screen.getByRole("link", { name: new RegExp(labels.whatsappLabel) });
    expect(link).toHaveAttribute(
      "href",
      buildWhatsAppUrl(siteConfig.contact.whatsappNumber, siteConfig.contact.whatsappMessage),
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAccessibleName(/se abre en una pestaña nueva/);
  });

  it("links phone and email", () => {
    renderDetails();

    expect(screen.getByRole("link", { name: siteConfig.contact.phoneDisplay })).toHaveAttribute(
      "href",
      `tel:+${siteConfig.contact.phoneE164}`,
    );
    expect(screen.getByRole("link", { name: siteConfig.contact.email })).toHaveAttribute(
      "href",
      `mailto:${siteConfig.contact.email}`,
    );
  });

  it("shows the address with a map link instead of an embedded map", () => {
    const { container } = render(
      <ContactDetails
        contact={siteConfig.contact}
        address={siteConfig.address}
        hours={siteConfig.hours}
        confidentialityNote={siteConfig.confidentialityNote}
        responseTime={siteConfig.responseTime}
        labels={labels}
      />,
    );

    expect(container.querySelector("address")).toHaveTextContent(siteConfig.address.street);
    const map = screen.getByRole("link", { name: new RegExp(labels.mapLinkLabel) });
    expect(map).toHaveAttribute("href", siteConfig.address.mapsUrl);
    expect(map).toHaveAttribute("rel", "noopener noreferrer");
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("shows every opening-hours entry, confidentiality and the response time (SPEC §11.2)", () => {
    renderDetails();

    for (const entry of siteConfig.hours) {
      expect(screen.getByText(`${entry.days}:`)).toBeInTheDocument();
    }
    expect(screen.getByText(siteConfig.confidentialityNote)).toBeInTheDocument();
    expect(screen.getByText(siteConfig.responseTime)).toBeInTheDocument();
  });
});
