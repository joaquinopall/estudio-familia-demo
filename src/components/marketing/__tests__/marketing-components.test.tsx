import { render, screen, within } from "@testing-library/react";
import { Clock, MapPin } from "lucide-react";
import { describe, expect, it } from "vitest";

import { CtaSection } from "@/components/marketing/cta-section";
import { FaqList } from "@/components/marketing/faq-list";
import { Hero } from "@/components/marketing/hero";
import { PracticeAreaCard } from "@/components/marketing/practice-area-card";
import { ProcessSteps } from "@/components/marketing/process-steps";
import { TrustBar } from "@/components/marketing/trust-bar";
import { siteConfig } from "@/config/site.config";

const cta = { label: "Contanos tu caso", href: "/contacto" };

describe("Hero", () => {
  it("renders the level-1 title, lead, call to action and note", () => {
    render(<Hero eyebrow="Estudio" title="Título" lead="Bajada" cta={cta} note="Nota" />);

    expect(screen.getByRole("heading", { level: 1, name: "Título" })).toBeInTheDocument();
    expect(screen.getByText("Bajada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: cta.label })).toHaveAttribute("href", cta.href);
    expect(screen.getByText("Nota")).toBeInTheDocument();
  });

  it("renders the practical facts as a description list, linking the ones with href", () => {
    const facts = [
      { icon: MapPin, label: "Dónde estamos", value: "Calle 123", href: "https://maps.example" },
      { icon: Clock, label: "Horario", value: "9 a 18 h" },
    ];
    render(
      <Hero eyebrow="Estudio" title="Título" lead="Bajada" cta={cta} note="Nota" facts={facts} />,
    );

    expect(screen.getByText("Dónde estamos").closest("dt")).not.toBeNull();
    expect(screen.getByRole("link", { name: /Calle 123/ })).toHaveAttribute(
      "href",
      "https://maps.example",
    );
    expect(screen.getByText("9 a 18 h").tagName).toBe("DD");
  });

  it("renders no facts card when there are no facts", () => {
    const { container } = render(
      <Hero eyebrow="Estudio" title="Título" lead="Bajada" cta={cta} note="Nota" />,
    );

    expect(container.querySelector("dl")).toBeNull();
  });
});

describe("PracticeAreaCard", () => {
  it("links the short title to the area page", () => {
    render(
      <PracticeAreaCard
        area={{ slug: "sucesiones", shortTitle: "Sucesiones", summary: "Resumen" }}
      />,
    );

    const link = screen.getByRole("link", { name: "Sucesiones" });
    expect(link).toHaveAttribute("href", "/areas/sucesiones");
    expect(screen.getByRole("heading", { level: 3, name: "Sucesiones" })).toContainElement(link);
    expect(screen.getByText("Resumen")).toBeInTheDocument();
  });
});

describe("ProcessSteps", () => {
  it("renders the steps as an ordered list", () => {
    const steps = [
      { title: "Uno", description: "a" },
      { title: "Dos", description: "b" },
      { title: "Tres", description: "c" },
    ];
    render(<ProcessSteps steps={steps} />);

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Uno",
      "Dos",
      "Tres",
    ]);
  });
});

describe("TrustBar", () => {
  it("shows the trust signals of SPEC §11.2", () => {
    render(
      <TrustBar
        professionals={siteConfig.professionals}
        address={siteConfig.address}
        hours={siteConfig.hours}
        confidentialityNote={siteConfig.confidentialityNote}
        responseTime={siteConfig.responseTime}
      />,
    );

    for (const professional of siteConfig.professionals) {
      expect(screen.getByText(professional.name)).toBeInTheDocument();
      expect(screen.getByText(professional.registration)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /abre el mapa/ })).toHaveAttribute(
      "href",
      siteConfig.address.mapsUrl,
    );
    for (const entry of siteConfig.hours) {
      expect(screen.getByText(entry.days)).toBeInTheDocument();
    }
    expect(screen.getByText(siteConfig.confidentialityNote)).toBeInTheDocument();
    expect(screen.getByText(siteConfig.responseTime)).toBeInTheDocument();
  });

  it("titles each signal with a level-3 heading", () => {
    render(
      <TrustBar
        professionals={siteConfig.professionals}
        address={siteConfig.address}
        hours={siteConfig.hours}
        confidentialityNote={siteConfig.confidentialityNote}
        responseTime={siteConfig.responseTime}
      />,
    );

    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Profesionales matriculados",
      "Dónde estamos",
      "Horarios",
      "Confidencialidad",
    ]);
  });
});

describe("FaqList", () => {
  it("renders each question as a closed disclosure with its answer", () => {
    const faqs = [
      { question: "¿Primera?", answer: ["Respuesta uno.", "Segundo párrafo."] },
      { question: "¿Segunda?", answer: ["Respuesta dos."] },
    ];
    const { container } = render(<FaqList faqs={faqs} />);

    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(2);
    expect(details[0]).not.toHaveAttribute("open");
    expect(details[0]?.querySelector("summary")).toHaveTextContent("¿Primera?");
    expect(details[0]).toHaveTextContent("Segundo párrafo.");
  });
});

describe("CtaSection", () => {
  it("is a labelled section with a heading, a call to action and a note", () => {
    render(<CtaSection id="cta" title="¿Hablamos?" lead="Bajada" cta={cta} note="24 a 48 h" />);

    expect(screen.getByRole("region", { name: "¿Hablamos?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: cta.label })).toHaveAttribute("href", cta.href);
    expect(screen.getByText("24 a 48 h")).toBeInTheDocument();
  });
});
