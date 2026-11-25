import { homeBreadcrumb } from "@/content/home";

/**
 * /contacto copy (SPEC §11.3). Contact data (phone, email, WhatsApp, address, hours, response
 * time) comes from site.config.ts (FR-03). The form's texts are in inquiry-form.ts.
 */
export const contactPageContent = {
  breadcrumbs: [homeBreadcrumb, { label: "Contacto", href: "/contacto" }],
  title: "Contacto",
  lead: "Contanos tu situación por el medio que te resulte más cómodo. Leemos cada consulta con atención y te respondemos personalmente.",
  details: {
    title: "Datos de contacto",
    whatsappLabel: "Escribinos por WhatsApp",
    phoneLabel: "Teléfono",
    emailLabel: "Email",
    addressLabel: "Dirección",
    mapLinkLabel: "Ver en Google Maps",
    hoursLabel: "Horarios de atención",
    confidentialityLabel: "Confidencialidad",
  },
  faqs: {
    title: "Antes de escribirnos",
    lead: "Algunas dudas habituales sobre la primera consulta.",
    linkLabel: "Ver todas las preguntas",
    href: "/preguntas-frecuentes",
  },
  metadata: {
    title: "Contacto",
    description:
      "Escribinos por WhatsApp, llamanos o envianos un email. Dirección, horarios de atención y tiempo de respuesta del estudio.",
  },
} as const;

export type ContactDetailsLabels = (typeof contactPageContent)["details"];
