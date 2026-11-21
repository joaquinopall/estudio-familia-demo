/**
 * General FAQs (SPEC §11.3): grouped for /preguntas-frecuentes, with 3 marked as featured for
 * the home page. Area-specific questions live in practice-areas.ts.
 *
 * Content rules (SPEC §11.4): plain language, no promises of results, no testimonials, and no
 * firm data (name, phone, hours): components take those from site.config.ts (FR-03).
 * DRAFT texts: they must be reviewed by the firm before going live.
 */

export type Faq = {
  question: string;
  /** One string per paragraph. */
  answer: readonly string[];
};

export const faqGroups = [
  { id: "first-consultation", title: "La primera consulta" },
  { id: "fees", title: "Honorarios y costos" },
  { id: "how-we-work", title: "Cómo trabajamos" },
  { id: "privacy", title: "Confidencialidad y datos" },
] as const;

export type FaqGroupId = (typeof faqGroups)[number]["id"];

export type GeneralFaq = Faq & {
  group: FaqGroupId;
  /** Shown on the home page (exactly 3, SPEC §11.3). */
  featured?: boolean;
};

export const generalFaqs = [
  {
    group: "first-consultation",
    featured: true,
    question: "¿Cómo es la primera conversación?",
    answer: [
      "Nos contás qué está pasando, con tus palabras y a tu ritmo. No hace falta que sepas de derecho ni que traigas todo resuelto.",
      "Te hacemos algunas preguntas para entender tu situación y te explicamos, en lenguaje simple, qué opciones existen y cuáles serían los próximos pasos.",
    ],
  },
  {
    group: "first-consultation",
    question: "¿Qué tengo que preparar antes de consultar?",
    answer: [
      "Nada en especial. Si tenés a mano documentos relacionados con tu caso (partidas, acuerdos previos, notificaciones que hayas recibido), pueden ser útiles, pero no son necesarios para empezar.",
      "Si hace falta algún papel, te lo vamos a indicar después de escucharte.",
    ],
  },
  {
    group: "first-consultation",
    question: "¿Puedo consultar aunque todavía no haya decidido qué hacer?",
    answer: [
      "Sí. Muchas personas consultan justamente para entender sus opciones antes de decidir. Consultar no te obliga a iniciar ningún trámite.",
    ],
  },
  {
    group: "fees",
    featured: true,
    question: "¿Cuánto cuesta la consulta y el trámite?",
    answer: [
      "Depende de cada caso: del tipo de trámite, de si hay acuerdo entre las partes y de su complejidad. Por eso no publicamos montos fijos.",
      "En la primera conversación te explicamos cómo se calculan los honorarios y los gastos del trámite, para que puedas decidir con toda la información.",
    ],
  },
  {
    group: "fees",
    question: "¿Hay otros gastos además de los honorarios?",
    answer: [
      "Según el trámite, puede haber gastos como tasas de justicia, aportes profesionales, mediación o inscripciones en registros. Te los detallamos antes de empezar, para que no haya sorpresas.",
    ],
  },
  {
    group: "how-we-work",
    featured: true,
    question: "¿Cuánto tiempo lleva un trámite de familia o una sucesión?",
    answer: [
      "No hay un plazo único: depende del tipo de trámite, de si hay acuerdo y de los tiempos de cada juzgado. Nadie puede asegurar una fecha exacta.",
      "Lo que sí hacemos es explicarte cuáles son las etapas, qué depende de nosotros y qué no, y mantenerte al tanto de cada avance.",
    ],
  },
  {
    group: "how-we-work",
    question: "¿Tengo que ir al estudio o se puede hacer a distancia?",
    answer: [
      "Las dos opciones son posibles. Podemos hablar en el estudio, por teléfono o por videollamada, según lo que te resulte más cómodo. Algunas etapas del trámite pueden requerir tu presencia, y te avisamos con tiempo.",
    ],
  },
  {
    group: "how-we-work",
    question: "¿Cómo me entero de cómo avanza mi caso?",
    answer: [
      "Te contamos cada novedad importante y podés escribirnos cuando tengas dudas. Preferimos que sepas en qué etapa está tu trámite y qué viene después.",
    ],
  },
  {
    group: "privacy",
    question: "¿Lo que cuento es confidencial?",
    answer: [
      "Sí. La primera conversación es confidencial y todo lo que nos cuentes está protegido por el secreto profesional.",
    ],
  },
  {
    group: "privacy",
    question: "¿Qué hacen con los datos que dejo en el formulario?",
    answer: [
      "Los usamos solo para responder tu consulta y contactarte por el medio que elijas. No los compartimos con terceros con fines comerciales.",
      "En la política de privacidad te contamos en detalle cómo los guardamos, por cuánto tiempo y cómo podés pedir que los modifiquemos o eliminemos.",
    ],
  },
] as const satisfies readonly GeneralFaq[];

export function getFeaturedFaqs(): readonly GeneralFaq[] {
  return generalFaqs.filter((faq: GeneralFaq) => faq.featured === true);
}
