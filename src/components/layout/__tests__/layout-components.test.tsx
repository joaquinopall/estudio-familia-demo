import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DemoBanner } from "@/components/layout/demo-banner";
import { Footer } from "@/components/layout/footer";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/layout/skip-link";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { siteConfig } from "@/config/site.config";

describe("SkipLink", () => {
  it("points to the main content", () => {
    render(<SkipLink />);

    expect(screen.getByRole("link", { name: "Saltar al contenido" })).toHaveAttribute(
      "href",
      `#${MAIN_CONTENT_ID}`,
    );
  });
});

describe("DemoBanner", () => {
  it("shows the demo notice when enabled (FR-15)", () => {
    render(<DemoBanner enabled />);

    expect(screen.getByRole("note")).toHaveTextContent("Sitio de demostración — estudio ficticio");
  });

  it("renders nothing when disabled", () => {
    const { container } = render(<DemoBanner enabled={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("WhatsAppButton", () => {
  it("links to wa.me with the generic message in a new tab (FR-13)", () => {
    render(<WhatsAppButton number="5491100000000" message="Hola, quisiera hacer una consulta." />);

    const link = screen.getByRole("link", { name: /Escribinos por WhatsApp/ });
    expect(link).toHaveAttribute(
      "href",
      "https://wa.me/5491100000000?text=Hola%2C%20quisiera%20hacer%20una%20consulta.",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("Footer", () => {
  it("shows the legal disclaimer and the privacy link (SPEC §11.4, US-07)", () => {
    render(<Footer config={siteConfig} />);

    expect(screen.getByText(siteConfig.legal.disclaimer)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute(
      "href",
      "/privacidad",
    );
  });

  it("shows the trust signals from the config (SPEC §11.2)", () => {
    render(<Footer config={siteConfig} />);
    const footer = screen.getByRole("contentinfo");

    expect(
      within(footer).getByText("La primera conversación es confidencial."),
    ).toBeInTheDocument();
    for (const professional of siteConfig.professionals) {
      expect(within(footer).getByText(professional.name)).toBeInTheDocument();
      expect(within(footer).getByText(professional.registration)).toBeInTheDocument();
    }
    expect(within(footer).getByText(siteConfig.responseTime)).toBeInTheDocument();
    expect(within(footer).getByRole("link", { name: siteConfig.contact.email })).toHaveAttribute(
      "href",
      `mailto:${siteConfig.contact.email}`,
    );
    expect(
      within(footer).getByRole("link", { name: siteConfig.contact.phoneDisplay }),
    ).toHaveAttribute("href", `tel:+${siteConfig.contact.phoneE164}`);
  });
});
