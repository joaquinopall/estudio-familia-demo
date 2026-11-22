/**
 * Home page copy (SPEC §11.3). Firm data (name, registrations, address, hours, response time)
 * is not repeated here: it comes from site.config.ts (FR-03).
 *
 * Content rules (SPEC §11.4): plain language, no promises of results, no testimonials.
 * DRAFT texts: they must be reviewed by the firm before going live.
 */

/** First item of every breadcrumb trail. */
export const homeBreadcrumb = { label: "Inicio", href: "/" } as const;

export type ProcessStep = { title: string; description: string };

export type SectionCopy = { title: string; lead: string };

export const homeContent = {
  hero: {
    eyebrow: "Familia y sucesiones",
    title: "Te acompañamos en los temas de familia que más importan",
    lead: "Sucesiones, divorcios, alimentos y cuidado de los hijos. Te escuchamos y te explicamos tus opciones con claridad, en lenguaje simple.",
    credentialsLabel: "Profesionales matriculados",
  },
  areas: {
    title: "¿En qué te podemos ayudar?",
    lead: "Elegí el tema que se parece a tu situación para leer más. Si no sabés cuál elegir, contanos tu caso y lo vemos juntos.",
  },
  process: {
    title: "Cómo trabajamos",
    lead: "Un proceso simple, para que sepas en todo momento qué viene después.",
    steps: [
      {
        title: "Contanos tu caso",
        description:
          "Completá el formulario o escribinos por WhatsApp. Alcanza con unas pocas líneas sobre lo que está pasando.",
      },
      {
        // Never promise a call: the person may live with whoever is hurting them.
        title: "Te contactamos por el medio que elijas",
        description:
          "Conversamos con tranquilidad, analizamos tu situación y revisamos la documentación que tengas.",
      },
      {
        title: "Te proponemos un camino claro",
        description:
          "Te explicamos las opciones posibles, los pasos, los tiempos estimados y los costos, para que decidas con toda la información.",
      },
    ],
  },
  trust: {
    title: "Un estudio cercano, con datos claros",
    lead: "Sabé con quién vas a hablar, dónde estamos y cuándo podés encontrarnos.",
  },
  faqs: {
    title: "Preguntas frecuentes",
    lead: "Algunas dudas habituales antes de consultar.",
    linkLabel: "Ver todas las preguntas",
    href: "/preguntas-frecuentes",
  },
  finalCta: {
    title: "¿Querés contarnos tu caso?",
    lead: "Escribinos con tus palabras. Consultar no te obliga a iniciar ningún trámite.",
  },
} as const satisfies {
  hero: { eyebrow: string; title: string; lead: string; credentialsLabel: string };
  areas: SectionCopy;
  process: SectionCopy & { steps: readonly ProcessStep[] };
  trust: SectionCopy;
  faqs: SectionCopy & { linkLabel: string; href: string };
  finalCta: SectionCopy;
};
