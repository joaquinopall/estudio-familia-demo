import type { Faq } from "@/content/faqs";

/**
 * Practice areas (SPEC FR-02). Each one feeds its card on the home page and its page at
 * /areas/[slug], with the sections of SPEC §11.3 / US-02 CA1.
 *
 * Content rules (SPEC §11.4): plain language, no promises of results, no testimonials, and no
 * firm data (FR-03). DRAFT texts: they must be reviewed by the firm before going live.
 */

/** Values of the PracticeArea enum (SPEC §7) that have their own page. OTHER has none. */
export type InquiryAreaCode =
  "SUCCESSION" | "DIVORCE" | "CHILD_SUPPORT" | "PARENTING" | "AGREEMENTS";

export type PracticeAreaContent = {
  /** URL segment: /areas/[slug] and /contacto?area=[slug]. Lowercase kebab-case, no accents. */
  slug: string;
  inquiryArea: InquiryAreaCode;
  title: string;
  /** Family areas show the helplines for someone at risk (SPEC §11.5). */
  showsSafetyNotice: boolean;
  /** Shorter title for cards and tight spaces. */
  shortTitle: string;
  /** One or two sentences for the card on the home page. */
  summary: string;
  /** "Qué es", one string per paragraph. */
  intro: readonly string[];
  /** "¿Cuándo consultar?" */
  whenToConsult: readonly string[];
  /** "¿Qué documentación suele hacer falta?" */
  documents: readonly string[];
  faqs: readonly Faq[];
  metadata: { title: string; description: string };
};

export const practiceAreas = [
  {
    slug: "sucesiones",
    inquiryArea: "SUCCESSION",
    showsSafetyNotice: false,
    title: "Sucesiones",
    shortTitle: "Sucesiones",
    summary:
      "Cuando fallece un familiar, te ayudamos a ordenar el trámite para que los bienes pasen a sus herederos.",
    intro: [
      "La sucesión es el trámite judicial que se hace cuando una persona fallece, para determinar quiénes son sus herederos y transmitirles sus bienes: una casa, un auto, dinero en el banco u otros.",
      "Puede hacerse con o sin testamento. Si no hay testamento, la ley establece quiénes heredan y en qué proporción. Te explicamos cada etapa y qué se necesita, para que el trámite sea lo más simple posible en un momento que ya es difícil.",
    ],
    whenToConsult: [
      "Falleció un familiar que tenía bienes a su nombre (una propiedad, un auto, cuentas bancarias).",
      "Necesitás vender, alquilar o usar un bien que era de la persona fallecida.",
      "Hay un testamento, o no sabés si existe.",
      "Los herederos no se ponen de acuerdo sobre cómo seguir.",
    ],
    documents: [
      "Partida de defunción.",
      "Partidas que acrediten el vínculo con la persona fallecida (de nacimiento o de matrimonio).",
      "DNI de quienes van a iniciar el trámite.",
      "Información sobre los bienes: títulos de propiedad, datos de vehículos o de cuentas bancarias.",
      "El testamento, si existe.",
      "El último domicilio de la persona fallecida.",
    ],
    faqs: [
      {
        question: "¿Hay un plazo para iniciar la sucesión?",
        answer: [
          "No hay un plazo corto para iniciarla, pero postergarla puede traer complicaciones: mientras no se haga, los bienes no se pueden vender ni transferir a nombre de los herederos.",
        ],
      },
      {
        question: "¿Puedo vender una propiedad heredada sin hacer la sucesión?",
        answer: [
          "En general, no. Primero hay que tramitar la sucesión para que la propiedad quede a nombre de los herederos o para que el juzgado autorice la venta. Te explicamos qué alternativa conviene en tu caso.",
        ],
      },
      {
        question: "¿Qué pasa si no hay testamento?",
        answer: [
          "La ley establece quiénes heredan y en qué proporción; por ejemplo, los hijos y el cónyuge. La mayoría de las sucesiones se hacen sin testamento.",
        ],
      },
      {
        question: "¿Se puede hacer si los herederos viven en lugares distintos?",
        answer: [
          "Sí. No es necesario que todos estén en la misma ciudad. Coordinamos la firma de la documentación para que cada persona pueda participar desde donde esté.",
        ],
      },
    ],
    metadata: {
      title: "Sucesiones",
      description:
        "Qué es una sucesión, cuándo conviene iniciarla y qué documentación hace falta. Te lo explicamos en lenguaje simple.",
    },
  },
  {
    slug: "divorcio",
    inquiryArea: "DIVORCE",
    showsSafetyNotice: true,
    title: "Divorcio",
    shortTitle: "Divorcio",
    summary:
      "Te acompañamos a ordenar el divorcio y los acuerdos sobre la casa, los bienes y los hijos.",
    intro: [
      "Hoy el divorcio no exige explicar los motivos ni esperar un tiempo mínimo de casados. Lo puede pedir uno solo de los cónyuges o los dos juntos.",
      "Junto con el pedido se presenta una propuesta sobre cómo organizar lo que sigue: la vivienda, los bienes y, si hay hijos, su cuidado y la cuota alimentaria. Si hay acuerdo, el trámite suele ser más simple; si no, lo que no se acuerda se resuelve aparte, sin frenar el divorcio.",
    ],
    whenToConsult: [
      "Decidiste divorciarte, o lo estás pensando y querés conocer tus opciones.",
      "Tu pareja inició el divorcio y recibiste una notificación.",
      "Ya están separados de hecho y necesitan ordenar la situación legal.",
      "Hay hijos, una vivienda o bienes en común y querés saber cómo se organizan.",
    ],
    documents: [
      "Partida o acta de matrimonio.",
      "DNI.",
      "Partidas de nacimiento de los hijos, si los hay.",
      "Datos del último domicilio en común.",
      "Información sobre los bienes: títulos de propiedad, datos de vehículos o de cuentas.",
      "Acuerdos que ya hayan firmado entre ustedes, si existen.",
    ],
    faqs: [
      {
        question: "¿Necesito que mi pareja esté de acuerdo para divorciarme?",
        answer: [
          "No. El divorcio lo puede pedir uno solo de los cónyuges. Lo que puede requerir acuerdo, o una decisión del juzgado, son los temas que se organizan alrededor: la vivienda, los bienes y los hijos.",
        ],
      },
      {
        question: "¿Tengo que explicar por qué me quiero divorciar?",
        answer: [
          "No. Ya no existen las causas de divorcio: no hace falta dar motivos ni probar culpas.",
        ],
      },
      {
        question: "¿Qué pasa con la casa y los bienes?",
        answer: [
          "Depende de cuándo y cómo se compraron, y de lo que puedan acordar. Analizamos tu situación y te explicamos cómo se dividen y qué opciones tienen.",
        ],
      },
      {
        question: "¿El divorcio cambia la relación con nuestros hijos?",
        answer: [
          "Ambos siguen siendo responsables de los hijos. Lo que se organiza es cómo se comparten su cuidado, el tiempo con cada uno y los gastos. Siempre se busca lo mejor para ellos.",
        ],
      },
    ],
    metadata: {
      title: "Divorcio",
      description:
        "Cómo es el divorcio hoy, qué se acuerda sobre la casa, los bienes y los hijos, y qué documentación hace falta.",
    },
  },
  {
    slug: "alimentos",
    inquiryArea: "CHILD_SUPPORT",
    showsSafetyNotice: true,
    title: "Alimentos",
    shortTitle: "Alimentos",
    summary: "Te ayudamos a acordar, reclamar o actualizar la cuota alimentaria de tus hijos.",
    intro: [
      "La cuota alimentaria cubre lo que tus hijos necesitan para vivir: comida, vivienda, salud, educación, vestimenta y esparcimiento. Es una obligación de ambos progenitores, convivan o no con ellos.",
      "Se puede acordar entre las partes o fijar en un juzgado. En muchos casos hay una instancia previa de mediación para intentar llegar a un acuerdo. Si la situación cambia, la cuota también se puede revisar.",
    ],
    whenToConsult: [
      "El otro progenitor no aporta para los gastos de tus hijos, o aporta muy poco.",
      "Hay una cuota acordada o fijada que no se cumple.",
      "Cambiaron los gastos o los ingresos y la cuota quedó desactualizada.",
      "Te reclaman una cuota y querés saber cómo responder.",
    ],
    documents: [
      "Partidas de nacimiento de los hijos.",
      "DNI.",
      "Comprobantes de gastos: colegio, salud, alquiler, actividades.",
      "Información sobre el trabajo o los ingresos del otro progenitor, si la tenés.",
      "El acuerdo o la sentencia anterior, si ya hay una cuota fijada.",
    ],
    faqs: [
      {
        question: "¿Hasta qué edad se pagan los alimentos?",
        answer: [
          "En general, hasta los 21 años. Si el hijo o la hija estudia o se capacita y eso le impide mantenerse, puede extenderse hasta los 25.",
        ],
      },
      {
        question: "¿Qué pasa si no sé cuánto gana el otro progenitor?",
        answer: [
          "No es un impedimento para reclamar. Durante el trámite se puede pedir información sobre sus ingresos y, si no se conocen con exactitud, se tienen en cuenta otros indicios de su nivel de vida.",
        ],
      },
      {
        question: "¿Se puede pedir que la cuota aumente?",
        answer: [
          "Sí. Si cambian las necesidades de los hijos o los ingresos de quien paga, se puede pedir que la cuota se revise.",
        ],
      },
      {
        question: "¿Qué hago si no me pagan la cuota?",
        answer: [
          "Existen herramientas legales para reclamar las cuotas que se deben. Te explicamos cuáles corresponden en tu caso.",
        ],
      },
    ],
    metadata: {
      title: "Alimentos y cuota alimentaria",
      description:
        "Qué cubre la cuota alimentaria, hasta qué edad corresponde y cómo se acuerda, reclama o actualiza.",
    },
  },
  {
    slug: "cuidado-personal",
    inquiryArea: "PARENTING",
    showsSafetyNotice: true,
    title: "Cuidado personal y régimen de comunicación",
    shortTitle: "Cuidado personal",
    summary:
      "Te ayudamos a organizar con quién viven tus hijos y cómo mantienen el vínculo con cada progenitor.",
    intro: [
      "Cuando los progenitores no conviven, hay que organizar con quién viven los hijos y cómo comparten el tiempo con cada uno. Eso es el cuidado personal y el régimen de comunicación.",
      "La regla es que el cuidado sea compartido, y siempre se busca lo mejor para los hijos, que tienen derecho a ser escuchados. Lo ideal es llegar a un acuerdo; si no es posible, lo decide un juzgado.",
    ],
    whenToConsult: [
      "Se están separando y necesitan organizar el cuidado de los hijos.",
      "El régimen de comunicación acordado no se cumple.",
      "Te impiden ver a tus hijos o tenés dificultades para mantener el contacto.",
      "Hay un cambio importante, como una mudanza, que afecta la organización familiar.",
    ],
    documents: [
      "Partidas de nacimiento de los hijos.",
      "DNI.",
      "Información sobre la escuela, la salud y las actividades de los hijos.",
      "Acuerdos o resoluciones anteriores, si existen.",
      "Antecedentes relevantes, como denuncias o informes, si los hay.",
    ],
    faqs: [
      {
        question: "¿Qué significa que el cuidado sea compartido?",
        answer: [
          "Que ambos progenitores participan en la vida y en las decisiones de los hijos. No implica necesariamente que pasen el mismo tiempo con cada uno: se organiza según lo que mejor funcione para la familia.",
        ],
      },
      {
        question: "¿Mis hijos pueden opinar?",
        answer: [
          "Sí. Tienen derecho a ser escuchados, y su opinión se tiene en cuenta según su edad y su grado de madurez.",
        ],
      },
      {
        question: "¿Me puedo mudar con mis hijos a otra ciudad?",
        answer: [
          "Conviene acordarlo con el otro progenitor o consultarlo antes, porque cambia la organización familiar. Si no hay acuerdo, puede tener que decidirlo un juzgado.",
        ],
      },
      {
        question: "¿Qué hago si hay violencia o una situación de riesgo?",
        answer: [
          "Lo primero es tu seguridad y la de tus hijos. Si hay una emergencia, llamá al 911. Podés llamar en cualquier momento al 137, opción 1 (violencia familiar), o al 144 (violencia de género). También podés denunciar las 24 horas en la Oficina de Violencia Doméstica, Lavalle 1250, CABA.",
          "Después, te ayudamos a pedir las medidas de protección que correspondan.",
        ],
      },
    ],
    metadata: {
      title: "Cuidado personal y régimen de comunicación",
      description:
        "Cómo se organiza el cuidado de los hijos y el régimen de comunicación cuando los progenitores no conviven.",
    },
  },
  {
    slug: "convenios-y-acuerdos",
    inquiryArea: "AGREEMENTS",
    showsSafetyNotice: true,
    title: "Convenios y acuerdos familiares",
    shortTitle: "Convenios y acuerdos",
    summary:
      "Te ayudamos a dejar por escrito lo que acuerdan, para que sea claro y se pueda cumplir.",
    intro: [
      "Muchos temas de familia se pueden resolver por acuerdo: la cuota alimentaria, el cuidado de los hijos, el régimen de comunicación o la división de los bienes. Llegar a un acuerdo suele ser más rápido y menos desgastante que un juicio.",
      "Te ayudamos a redactarlo con claridad y, cuando conviene, a presentarlo en un juzgado para que lo homologue. Un acuerdo homologado tiene la misma fuerza que una sentencia y se puede exigir si no se cumple.",
    ],
    whenToConsult: [
      "Ya se pusieron de acuerdo y quieren dejarlo por escrito.",
      "Tienen un acuerdo de palabra que no se está cumpliendo.",
      "Quieren evitar un juicio y buscar una solución conversada.",
      "Cambió la situación y el acuerdo que tienen ya no funciona.",
    ],
    documents: [
      "DNI de las personas que firman el acuerdo.",
      "Partidas de nacimiento o de matrimonio, según el tema.",
      "Información sobre los bienes, los ingresos o los gastos que se van a incluir.",
      "Acuerdos anteriores, si existen.",
    ],
    faqs: [
      {
        question: "¿Sirve un acuerdo de palabra?",
        answer: [
          "Es un buen punto de partida, pero si no se cumple es difícil de exigir. Por eso conviene dejarlo por escrito y, según el caso, homologarlo.",
        ],
      },
      {
        question: "¿Qué significa homologar un acuerdo?",
        answer: [
          "Es presentarlo en un juzgado para que lo revise y lo apruebe. Una vez homologado, tiene la fuerza de una sentencia: si una parte no lo cumple, la otra puede pedir que se haga cumplir.",
        ],
      },
      {
        question: "¿Se puede cambiar un acuerdo más adelante?",
        answer: [
          "Sí. Si cambian las circunstancias, se puede firmar un nuevo acuerdo o pedir que se revise.",
        ],
      },
    ],
    metadata: {
      title: "Convenios y acuerdos familiares",
      description:
        "Cómo dejar por escrito un acuerdo de familia sobre alimentos, cuidado de los hijos o bienes, y cómo homologarlo.",
    },
  },
] as const satisfies readonly PracticeAreaContent[];

/** Contact link with the area preselected in the form (SPEC §11.3). */
export function getAreaContactHref(slug: string): string {
  return `/contacto?area=${encodeURIComponent(slug)}`;
}

export function getPracticeAreaBySlug(slug: string): PracticeAreaContent | undefined {
  return practiceAreas.find((area: PracticeAreaContent) => area.slug === slug);
}
