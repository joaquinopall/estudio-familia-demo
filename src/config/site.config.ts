/**
 * Firm configuration (SPEC FR-03). Every piece of firm data shown on the site comes from here,
 * so the demo becomes a real firm's site by editing this file, not components.
 *
 * DEMO DATA: everything below is FICTITIOUS (SPEC §11.4). Phone and WhatsApp use a
 * non-assignable number so the WhatsApp button never reaches a real person; the email uses
 * the reserved example.com domain.
 */

export type Professional = {
  name: string;
  /** Bar registration, e.g. "CPACF T° 000 F° 000". Mark it as fictitious in the demo. */
  registration: string;
  education: string;
};

export type OfficeHours = { days: string; hours: string };

export type DayOfWeek =
  "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

/** Machine-readable opening hours for structured data (schema.org OpeningHoursSpecification). */
export type OpeningHoursSpec = { days: DayOfWeek[]; opens: string; closes: string };

export type NavItem = { label: string; href: string };

export type SiteConfig = {
  name: string;
  shortName: string;
  /** One or two capital letters for the browser and home-screen icons. */
  monogram: string;
  tagline: string;
  description: string;
  isFictitious: boolean;
  professionals: Professional[];
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    mapsUrl: string;
  };
  geo: { latitude: number; longitude: number };
  /** Where the firm litigates: `label` for tight spaces, `note` as a sentence. */
  jurisdiction: { label: string; note: string };
  /** IANA time zone of the firm: dates and times in the panel use it, not the server's (UTC). */
  timeZone: string;
  /** Human-readable hours shown on the site. */
  hours: OfficeHours[];
  /** Same hours, structured (24 h "HH:MM"). Keep both in sync. */
  openingHours: OpeningHoursSpec[];
  contact: {
    /** Human-readable phone. */
    phoneDisplay: string;
    /** E.164 without "+", used for tel: links. */
    phoneE164: string;
    /** Digits only (country code included), as wa.me expects. */
    whatsappNumber: string;
    /** Generic prefilled message: never include personal data (FR-13, US-04). */
    whatsappMessage: string;
    email: string;
  };
  responseTime: string;
  /** Trust signal required by SPEC §11.2, shown in the hero, the trust block and the footer. */
  confidentialityNote: string;
  social: { label: string; href: string }[];
  navigation: NavItem[];
  primaryCta: NavItem;
  legal: {
    disclaimer: string;
    privacyHref: string;
  };
};

export const siteConfig: SiteConfig = {
  name: "Estudio Alameda — Familia y Sucesiones",
  shortName: "Estudio Alameda",
  monogram: "A",
  tagline: "Acompañamiento legal en temas de familia y sucesiones",
  description:
    "Estudio jurídico de familia y sucesiones en la Ciudad de Buenos Aires. Te escuchamos, te explicamos tus opciones con claridad y te acompañamos en cada paso.",
  isFictitious: true,
  professionals: [
    {
      name: "Dra. Lucía Alameda",
      registration: "CPACF T° 000 F° 000 (matrícula ficticia)",
      education: "Abogada (UBA). Especialista en Derecho de Familia.",
    },
    {
      name: "Dr. Martín Sosa",
      registration: "CPACF T° 000 F° 001 (matrícula ficticia)",
      education: "Abogado (UBA). Práctica en sucesiones y planificación patrimonial familiar.",
    },
  ],
  address: {
    street: "Av. Ficticia 1234, piso 5, oficina B",
    city: "Ciudad Autónoma de Buenos Aires",
    region: "CABA",
    postalCode: "C1000",
    country: "AR",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Plaza+de+Mayo+Buenos+Aires",
  },
  geo: { latitude: -34.6083, longitude: -58.3712 },
  jurisdiction: { label: "CABA", note: "Atendemos trámites en CABA." },
  timeZone: "America/Argentina/Buenos_Aires",
  hours: [
    { days: "Lunes a viernes", hours: "9 a 18 h" },
    { days: "Sábados, domingos y feriados", hours: "Cerrado" },
  ],
  openingHours: [
    {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  ],
  contact: {
    phoneDisplay: "+54 11 0000-0000",
    phoneE164: "541100000000",
    whatsappNumber: "5491100000000",
    whatsappMessage: "Hola, quisiera hacer una consulta.",
    email: "contacto@example.com",
  },
  responseTime: "Te respondemos dentro de las próximas 24 a 48 horas hábiles.",
  confidentialityNote: "La primera conversación es confidencial.",
  social: [],
  navigation: [
    { label: "Inicio", href: "/" },
    { label: "Áreas de práctica", href: "/areas" },
    { label: "Nosotros", href: "/nosotros" },
    { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
    { label: "Contacto", href: "/contacto" },
  ],
  primaryCta: { label: "Contanos tu caso", href: "/contacto" },
  legal: {
    disclaimer: "La información de este sitio es general y no constituye asesoramiento legal.",
    privacyHref: "/privacidad",
  },
};
