import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CtaSection } from "@/components/marketing/cta-section";
import { FaqList } from "@/components/marketing/faq-list";
import { Hero } from "@/components/marketing/hero";
import { PracticeAreaCard } from "@/components/marketing/practice-area-card";
import { ProcessSteps } from "@/components/marketing/process-steps";
import { TrustBar } from "@/components/marketing/trust-bar";
import { UrgentNote } from "@/components/marketing/urgent-note";
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

  it("lists the professionals with their registration and the jurisdiction", () => {
    const credentials = {
      label: "Matriculados",
      professionals: [{ name: "Dra. X", registration: "T° 1 F° 2" }],
      note: "Atendemos acá.",
    };
    render(
      <Hero eyebrow="E" title="Título" lead="B" cta={cta} note="N" credentials={credentials} />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent("Dra. XT° 1 F° 2");
    expect(screen.getByText("Atendemos acá.")).toBeInTheDocument();
  });

  it("renders no card when there are no credentials", () => {
    const { container } = render(
      <Hero eyebrow="Estudio" title="Título" lead="Bajada" cta={cta} note="Nota" />,
    );

    expect(container.querySelector("ul")).toBeNull();
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

describe("UrgentNote", () => {
  it("links the phone and says when it is answered and what to do after hours", () => {
    render(
      <UrgentNote
        contact={{ phoneDisplay: "+54 11 0000-0000", phoneE164: "541100000000" }}
        hours={{ days: "Lunes a viernes", hours: "9 a 18 h" }}
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "tel:+541100000000");
    expect(screen.getByText("(Lunes a viernes, 9 a 18 h)")).toBeInTheDocument();
    expect(screen.getByText(/no esperes/)).toBeInTheDocument();
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
