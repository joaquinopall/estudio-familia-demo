import { homeBreadcrumb } from "@/content/home";

/**
 * /preguntas-frecuentes copy. The questions live in faqs.ts (general, grouped) and in
 * practice-areas.ts (per area, shown on each area page and linked from here).
 */
export const faqPageContent = {
  breadcrumbs: [homeBreadcrumb, { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" }],
  title: "Preguntas frecuentes",
  lead: "Respuestas generales a las dudas más habituales antes de consultar. Si no encontrás la tuya, escribinos: no hay preguntas tontas.",
  tocLabel: "Temas",
  areas: {
    title: "Preguntas sobre cada tema",
    lead: "Cada área tiene sus propias preguntas frecuentes. Elegí la que se parece a tu situación.",
  },
  finalCta: {
    title: "¿Te quedó alguna duda?",
    lead: "Contanos tu caso y te respondemos personalmente. Consultar no te obliga a iniciar ningún trámite.",
  },
  metadata: {
    title: "Preguntas frecuentes",
    description:
      "Cómo es la primera consulta, cómo se calculan los honorarios, cuánto tarda un trámite y qué pasa con tus datos.",
  },
} as const;
