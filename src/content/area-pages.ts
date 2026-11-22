/**
 * Copy for /areas and the shared section labels of /areas/[slug] (SPEC §11.3, US-02 CA1).
 * The text of each area lives in practice-areas.ts.
 *
 * Content rules (SPEC §11.4): plain language, no promises of results, no testimonials.
 * DRAFT texts: they must be reviewed by the firm before going live.
 */

import { homeBreadcrumb } from "@/content/home";

/** Breadcrumb trail shared by /areas and /areas/[slug]. */
export const areasBreadcrumbs = [
  homeBreadcrumb,
  { label: "Áreas de práctica", href: "/areas" },
] as const;

export const areasIndexContent = {
  title: "Áreas de práctica",
  lead: "Acompañamos a personas y familias en temas que suelen llegar en momentos difíciles. Elegí el tuyo para leer, en lenguaje simple, de qué se trata y qué se necesita.",
  /** Heading of the card list, for screen readers only. */
  listTitle: "Temas que atendemos",
  metadata: {
    title: "Áreas de práctica",
    description:
      "Sucesiones, divorcio, alimentos, cuidado personal y convenios familiares: qué es cada tema y cuándo conviene consultar.",
  },
  otherTopic: {
    title: "¿Tu situación no está en la lista?",
    lead: "Muchos temas de familia no encajan en una sola categoría. Contanos tu caso y te decimos si podemos ayudarte.",
  },
} as const;

export const areaPageContent = {
  whenToConsultTitle: "¿Cuándo consultar?",
  documentsTitle: "¿Qué documentación suele hacer falta?",
  documentsNote:
    "Es una lista orientativa: no hace falta que tengas todo para consultar. Te confirmamos qué se necesita en tu caso.",
  faqsTitle: "Preguntas frecuentes",
  otherAreasTitle: "Otras áreas",
} as const;
