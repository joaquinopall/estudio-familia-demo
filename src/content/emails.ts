/**
 * Texts of the inquiry emails (US-05, US-03 CA5, §11.5). Content, not code: a real firm can
 * adjust the wording here. No firm data (FR-03): the signature comes from site.config.ts.
 *
 * The receipt must stay NEUTRAL: whoever reads a shared mailbox must not learn the reason
 * for the inquiry. Never add the area, the urgency, the firm's specialty or a link to the
 * site. Tests enforce it (features/inquiries/__tests__/emails.test.tsx).
 */

export const firmNotificationEmail = {
  subject: (reference: string, area: string, doNotContact: boolean) =>
    `${doNotContact ? "[No iniciar contacto] " : ""}Nueva consulta ${reference} · ${area}`,
  preview: (reference: string) => `Consulta ${reference}: datos de contacto y link al panel.`,
  heading: "Nueva consulta",
  doNotContactTitle: "NO INICIAR CONTACTO",
  doNotContactBody:
    "La persona no indicó ningún medio seguro. No la llamen, no le escriban y no le respondan por email. Si se comunica con el estudio, pidan el número de referencia.",
  contactViaTitle: (channel: string) => `Contactar por: ${channel}`,
  contactViaBody:
    "Es el medio que la persona indicó como seguro. No usen otro sin consultarle antes.",
  fields: {
    reference: "Referencia",
    fullName: "Nombre",
    area: "Área",
    urgency: "Urgencia",
    preferredChannel: "Canal preferido",
    safeToContact: "¿Es seguro contactarla por ese medio?",
    emailIsPrivate: "¿El email es privado?",
  },
  yes: "Sí",
  no: "No",
  notApplicable: "No aplica (eligió email)",
  panelButton: "Ver la consulta en el panel",
  messageNote:
    "El mensaje no se incluye en este mail por seguridad: se lee en el panel, con tu usuario.",
} as const;

export const receiptEmail = {
  subject: "Recibimos tu mensaje",
  /** Shown by the inbox before opening: as neutral as the subject. */
  preview: "Recibimos tu mensaje y te vamos a responder pronto.",
  greeting: (fullName: string) => `Hola, ${fullName}:`,
  body: "Recibimos tu mensaje. Te vamos a responder dentro de las próximas 24 a 48 horas hábiles.",
  referenceLabel: "Tu número de referencia es",
  referenceHint: "Guardalo: te lo vamos a pedir si te comunicás con nosotros.",
  closing: "Saludos,",
} as const;
