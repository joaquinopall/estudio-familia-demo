import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LegalDocument } from "@/components/marketing/legal-document";
import { PageHeader } from "@/components/marketing/page-header";
import { ProfessionalCard } from "@/components/marketing/professional-card";
import { TableOfContents } from "@/components/marketing/table-of-contents";

const breadcrumbs = [
  { label: "Inicio", href: "/" },
  { label: "Nosotros", href: "/nosotros" },
];

describe("PageHeader", () => {
  it("renders a labelled section with breadcrumbs, the h1 and each lead paragraph", () => {
    render(
      <PageHeader id="t" breadcrumbs={breadcrumbs} title="Nosotros" lead={["Uno.", "Dos."]}>
        <a href="/contacto">CTA</a>
      </PageHeader>,
    );

    expect(screen.getByRole("region", { name: "Nosotros" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Ruta" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Nosotros" })).toBeInTheDocument();
    expect(screen.getByText("Uno.")).toBeInTheDocument();
    expect(screen.getByText("Dos.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CTA" })).toBeInTheDocument();
  });

  it("accepts a single-string lead", () => {
    render(<PageHeader id="t" breadcrumbs={breadcrumbs} title="T" lead="Bajada." />);

    expect(screen.getByText("Bajada.")).toBeInTheDocument();
  });
});

describe("TableOfContents", () => {
  it("links each item to its anchor", () => {
    render(<TableOfContents label="Temas" items={[{ id: "uno", title: "Uno" }]} />);

    const nav = screen.getByRole("navigation", { name: "Temas" });
    expect(within(nav).getByRole("link", { name: "Uno" })).toHaveAttribute("href", "#uno");
  });
});

describe("LegalDocument", () => {
  it("renders the index and one labelled section per entry", () => {
    render(
      <LegalDocument
        tocLabel="Contenido"
        sections={[
          { id: "a", title: "Primera", body: <p>Texto A</p> },
          { id: "b", title: "Segunda", body: <p>Texto B</p> },
        ]}
      />,
    );

    expect(
      within(screen.getByRole("navigation", { name: "Contenido" })).getAllByRole("link"),
    ).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Segunda" })).toHaveAttribute("id", "b");
    expect(screen.getByRole("region", { name: "Segunda" })).toHaveTextContent("Texto B");
  });
});

describe("ProfessionalCard", () => {
  it("shows name, education and registration", () => {
    render(
      <ProfessionalCard
        professional={{ name: "Dra. X", registration: "T° 1 F° 2", education: "Abogada (UBA)." }}
      />,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Dra. X" })).toBeInTheDocument();
    expect(screen.getByText("Abogada (UBA).")).toBeInTheDocument();
    expect(screen.getByText("T° 1 F° 2")).toBeInTheDocument();
  });
});
