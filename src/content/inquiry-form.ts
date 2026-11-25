/**
 * Texts of the inquiry form (US-03, US-07, SPEC §8.1, §11.5). Content, not code: a real firm
 * can adjust the wording here. No firm data (FR-03): contact channels and the response time
 * come from site.config.ts. Validation messages live with the schema (INQUIRY_MESSAGES).
 *
 * Tone: calm and plain. Never promise a call (§11.5): the person chooses the channel.
 */

export const inquiryFormContent = {
  title: "Contanos tu caso",
  intro: "Son dos pasos cortos. Leemos cada consulta con atención y la tratamos con reserva.",
  requiredNote: "Todos los campos son obligatorios, salvo los que dicen “opcional”.",
  steps: {
    details: { title: "Tu consulta", progress: "Paso 1 de 2" },
    contact: { title: "Tus datos", progress: "Paso 2 de 2" },
  },
  fields: {
    area: { label: "¿Sobre qué es tu consulta?", placeholder: "Elegí una opción" },
    urgency: { legend: "¿Qué tan urgente es?" },
    message: {
      label: "Contanos tu caso",
      hint: "En pocas palabras: qué pasó y qué necesitás. Mínimo 20 caracteres.",
    },
    fullName: { label: "Nombre y apellido" },
    email: { label: "Email" },
    phone: { label: "Teléfono (opcional)", hint: "Con código de área. Ej.: 11 5555-1234." },
    preferredChannel: { legend: "¿Cómo preferís que te contactemos?" },
    safeToContact: {
      legend: "¿Es seguro que te contactemos por ese medio?",
      hint: "Pensá si otra persona puede ver tus mensajes o escuchar una llamada.",
      yes: "Sí, es seguro",
      no: "No, prefiero que no",
    },
    emailIsPrivate: {
      legend: "¿Este email es privado (solo lo leés vos)?",
      hint: "Si no es privado, no te mandamos ningún mail.",
      yes: "Sí, solo lo leo yo",
      no: "No, otra persona puede leerlo",
    },
    consent: {
      before: "Leí la ",
      link: "política de privacidad",
      after: " y acepto que usen mis datos para responder mi consulta.",
      href: "/privacidad",
      newTab: "(se abre en una pestaña nueva)",
    },
    honeypot: { label: "No completes este campo" },
  },
  buttons: {
    next: "Siguiente",
    back: "Volver",
    submit: "Enviar consulta",
    submitting: "Enviando…",
  },
  errorSummaryTitle: "Revisá estos datos:",
  noscript:
    "Para enviar el formulario hace falta JavaScript, porque lo usa la verificación contra el spam. Si no podés activarlo, escribinos por WhatsApp, llamanos o mandanos un email:",
  confirmation: {
    title: "Recibimos tu consulta",
    referenceLabel: "Tu número de referencia",
    /** Followed by siteConfig.responseTime. */
    contactNote: "Te vamos a contactar por el medio que nos indicaste como seguro.",
    doNotContactNote:
      "Como no nos indicaste un medio seguro, no vamos a iniciar el contacto. Guardá tu número de referencia y comunicate con el estudio cuando puedas hacerlo con tranquilidad.",
    keepReference: "Guardá el número de referencia: te lo vamos a pedir si nos escribís.",
  },
} as const;
