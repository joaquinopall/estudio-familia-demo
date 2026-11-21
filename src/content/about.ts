import { homeBreadcrumb } from "@/content/home";

/**
 * /nosotros copy (SPEC §11.3: approach, professionals and values). The professionals
 * (name, registration, education) come from site.config.ts (FR-03).
 *
 * Content rules (SPEC §11.4): plain language, no promises of results, no self-praise or
 * comparisons with colleagues, no testimonials. DRAFT texts: the firm must review them.
 */

export type AboutValue = { title: string; description: string };

export const aboutContent = {
  breadcrumbs: [homeBreadcrumb, { label: "Nosotros", href: "/nosotros" }],
  title: "Nosotros",
  lead: "Somos un estudio chico, dedicado a temas de familia y sucesiones. Sabemos que suelen llegar en momentos difíciles, y trabajamos para que tengas claridad y acompañamiento en cada paso.",
  approach: {
    title: "Cómo entendemos nuestro trabajo",
    paragraphs: [
      "Cada familia es distinta. Antes de hablar de trámites, te escuchamos para entender qué está pasando, qué te preocupa y qué necesitás.",
      "Te explicamos tus opciones en lenguaje simple, con sus pasos, tiempos y costos, para que puedas decidir con información. Cuando es posible, buscamos soluciones acordadas, que suelen ser menos desgastantes para todos.",
      "Atendemos personalmente cada caso, y vas a saber siempre con quién hablar y en qué etapa está tu trámite.",
    ],
  },
  professionals: {
    title: "Profesionales",
    lead: "Profesionales con matrícula que te van a acompañar en tu caso.",
  },
  values: {
    title: "Lo que guía nuestro trabajo",
    items: [
      {
        title: "Escucha",
        description: "Nos tomamos el tiempo de entender tu situación antes de proponer un camino.",
      },
      {
        title: "Claridad",
        description:
          "Te explicamos cada paso sin tecnicismos, y te contamos qué depende de nosotros y qué no.",
      },
      {
        title: "Confidencialidad",
        description:
          "Lo que nos contás queda protegido por el secreto profesional, desde la primera conversación.",
      },
      {
        title: "Respeto por tus tiempos",
        description:
          "Entendemos que algunas decisiones llevan tiempo. Te acompañamos sin presionarte.",
      },
    ],
  },
  metadata: {
    title: "Nosotros",
    description:
      "Conocé al estudio, a sus profesionales y la forma en que acompañamos los temas de familia y sucesiones.",
  },
} as const satisfies {
  breadcrumbs: readonly { label: string; href: string }[];
  title: string;
  lead: string;
  approach: { title: string; paragraphs: readonly string[] };
  professionals: { title: string; lead: string };
  values: { title: string; items: readonly AboutValue[] };
  metadata: { title: string; description: string };
};
