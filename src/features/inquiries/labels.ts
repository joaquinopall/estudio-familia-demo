/**
 * Interface labels of the inquiry enums, in es-AR (SPEC §8.1, FR-11). Used by the email to the
 * firm (F3-05/F3-06), the form (F3-07) and the panel (F4). One place, so they never diverge.
 */
import type { ContactChannel, InquiryStatus, PracticeArea, Urgency } from "./types";

export const PRACTICE_AREA_LABELS = {
  SUCCESSION: "Sucesiones",
  DIVORCE: "Divorcio",
  CHILD_SUPPORT: "Alimentos",
  PARENTING: "Cuidado personal y régimen de comunicación",
  AGREEMENTS: "Convenios y acuerdos",
  OTHER: "Otro tema de familia",
} as const satisfies Record<PracticeArea, string>;

export const URGENCY_LABELS = {
  LOW: "Sin apuro",
  NORMAL: "En las próximas semanas",
  HIGH: "Tengo un plazo o una audiencia cercana",
} as const satisfies Record<Urgency, string>;

/** Short urgency names for the panel's badges and filters, where the long ones do not fit. */
export const URGENCY_SHORT_LABELS = {
  LOW: "Baja",
  NORMAL: "Normal",
  HIGH: "Alta",
} as const satisfies Record<Urgency, string>;

export const CONTACT_CHANNEL_LABELS = {
  WHATSAPP: "WhatsApp",
  PHONE: "Teléfono",
  EMAIL: "Email",
} as const satisfies Record<ContactChannel, string>;

export const INQUIRY_STATUS_LABELS = {
  NEW: "Nueva",
  IN_REVIEW: "En revisión",
  CONTACTED: "Contactada",
  CLOSED: "Cerrada",
  DISCARDED: "Descartada",
} as const satisfies Record<InquiryStatus, string>;
