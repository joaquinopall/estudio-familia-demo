import { homeBreadcrumb } from "@/content/home";

/**
 * /contacto copy (SPEC §11.3). Contact data (phone, email, WhatsApp, address, hours, response
 * time) comes from site.config.ts (FR-03).
 *
 * F3 note: the inquiry form replaces `InquiryFormSlot`. To preselect the area from
 * `?area=<slug>` without making this page dynamic, read it inside the client form
 * (useSearchParams under <Suspense>), not with server-side searchParams.
 */
export const contactPageContent = {
  breadcrumbs: [homeBreadcrumb, { label: "Contacto", href: "/contacto" }],
  title: "Contacto",
  lead: "Contanos tu situación por el medio que te resulte más cómodo. Leemos cada consulta con atención y te respondemos personalmente.",
  formSlot: {
    title: "Contanos tu caso",
    notice:
      "Muy pronto vas a poder escribirnos desde acá. Mientras tanto, podés contactarnos por WhatsApp, por teléfono o por email.",
  },
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
