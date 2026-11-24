/**
 * Validation of inquiries (SPEC §8). One schema shared by the form and the server (FR-05),
 * always enforced on the server (NFR-SEC-01).
 *
 * `inquirySchema` takes the values as the form sends them (FormData: strings, "true"/"false"
 * for yes/no questions, "on" for the checkbox) and returns domain types, so the action only
 * needs `Object.fromEntries(formData)`. Unknown keys (Turnstile token, honeypot) are dropped.
 */
import { z } from "zod";

import {
  CONTACT_CHANNELS,
  INQUIRY_STATUSES,
  PRACTICE_AREAS,
  URGENCIES,
  type ContactChannel,
  isPhoneChannel,
} from "./types";

/** User-facing messages (SPEC §8.1), in es-AR. Tests check them verbatim. */
export const INQUIRY_MESSAGES = {
  area: "Elegí el tipo de consulta",
  urgency: "Indicá la urgencia",
  messageTooShort: "Contanos un poco más (mínimo 20 caracteres)",
  messageTooLong: "Máximo 2000 caracteres",
  fullName: "Ingresá tu nombre",
  email: "Ingresá un email válido",
  phone: "Ingresá un teléfono válido",
  preferredChannel: "Elegí cómo preferís que te contactemos",
  phoneRequired: "Para contactarte por ese medio necesitamos tu teléfono",
  safeToContact: "Decinos si es seguro contactarte por ese medio",
  emailIsPrivate: "Decinos si este email es privado",
  consent: "Necesitamos tu consentimiento para responderte",
} as const;

export const MESSAGE_MIN_LENGTH = 20;
export const MESSAGE_MAX_LENGTH = 2000;
export const FULL_NAME_MAX_LENGTH = 120;
export const EMAIL_MAX_LENGTH = 254;
/** Inquiry.phone is VarChar(30) (SPEC §7). */
export const PHONE_MAX_LENGTH = 30;
export const PHONE_MIN_DIGITS = 8;
export const PHONE_MAX_DIGITS = 20;

const m = INQUIRY_MESSAGES;

/** Letters (any language, with accents), spaces, apostrophes and hyphens. */
const FULL_NAME_PATTERN = /^[\p{L}\p{M}' -]+$/u;
const PHONE_PATTERN = /^[+\d -]+$/;

/**
 * Yes/no question sent as "true" / "false" (radio buttons). Missing or other value = error.
 * Not z.stringbool: it is a codec, and an invalid value would abort the conditional rules.
 */
const yesNo = (message: string) =>
  z.enum(["true", "false"], { error: message }).transform((value) => value === "true");

/*
 * Each field is checked by a single rule with a single message, without `pipe` or `abort`:
 * several failing rules would repeat the message, and an aborted field (pipe or abort: true)
 * makes Zod skip the conditional rules below, hiding their errors (US-03 CA2).
 */

const isValidFullName = (value: string) =>
  value.length >= 2 && value.length <= FULL_NAME_MAX_LENGTH && FULL_NAME_PATTERN.test(value);

const fullNameSchema = z
  .string({ error: m.fullName })
  .trim()
  // iOS turns ' into ’ (smart punctuation): "O’Brien" is stored as "O'Brien".
  .overwrite((value) => value.normalize("NFC").replaceAll("’", "'"))
  .refine(isValidFullName, { error: m.fullName });

const isValidEmail = (value: string) =>
  value.length <= EMAIL_MAX_LENGTH && z.regexes.email.test(value);

const emailSchema = z
  .string({ error: m.email })
  .trim()
  .toLowerCase()
  .refine(isValidEmail, { error: m.email });

const countDigits = (value: string) => value.replace(/\D/g, "").length;

/** Empty is valid here: it means "no phone". */
const isValidPhoneOrEmpty = (value: string) => {
  if (value === "") return true;
  const digits = countDigits(value);
  return (
    value.length <= PHONE_MAX_LENGTH &&
    PHONE_PATTERN.test(value) &&
    digits >= PHONE_MIN_DIGITS &&
    digits <= PHONE_MAX_DIGITS
  );
};

/** Optional: missing, empty or blank means "no phone" (null). */
const phoneSchema = z
  .string({ error: m.phone })
  .trim()
  .refine(isValidPhoneOrEmpty, { error: m.phone })
  .optional()
  .transform((value) => (value ? value : null));

const messageSchema = z
  .string({ error: m.messageTooShort })
  .trim()
  .min(MESSAGE_MIN_LENGTH, { error: m.messageTooShort })
  .max(MESSAGE_MAX_LENGTH, { error: m.messageTooLong });

/** The consent checkbox sends "on" (or "true"); unchecked sends nothing. */
const consentSchema = z.enum(["on", "true"], { error: m.consent }).transform((): true => true);

const preferredChannelSchema = z.enum(CONTACT_CHANNELS, { error: m.preferredChannel });

const isKnownChannel = (value: unknown): value is ContactChannel =>
  typeof value === "string" && (CONTACT_CHANNELS as readonly string[]).includes(value);

export const inquirySchema = z
  .object({
    area: z.enum(PRACTICE_AREAS, { error: m.area }),
    urgency: z.enum(URGENCIES, { error: m.urgency }),
    message: messageSchema,
    fullName: fullNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    preferredChannel: preferredChannelSchema,
    safeToContact: yesNo(m.safeToContact).optional(),
    emailIsPrivate: yesNo(m.emailIsPrivate),
    consent: consentSchema,
  })
  // Rules that depend on the channel. `when` makes them run even if other fields failed (Zod
  // skips refinements after a failed transform), so every error shows at once (US-03 CA2).
  // The values may then be unparsed, hence the guards.
  .superRefine(
    (data, ctx) => {
      if (!isKnownChannel(data.preferredChannel) || !isPhoneChannel(data.preferredChannel)) {
        return;
      }
      if (data.phone === null || data.phone === undefined) {
        ctx.addIssue({ code: "custom", path: ["phone"], message: m.phoneRequired });
      }
      if (data.safeToContact === undefined) {
        ctx.addIssue({ code: "custom", path: ["safeToContact"], message: m.safeToContact });
      }
    },
    { when: () => true },
  )
  // safeToContact only applies to phone channels: null for EMAIL (SPEC §7).
  .transform(({ safeToContact, ...data }) => ({
    ...data,
    safeToContact: isPhoneChannel(data.preferredChannel) ? (safeToContact ?? null) : null,
  }));

/** What the form sends (FormData entries). */
export type InquiryFormInput = z.input<typeof inquirySchema>;
/** Validated inquiry, ready for the service. */
export type InquiryData = z.output<typeof inquirySchema>;

/** Hidden field that only bots fill (SPEC §8.1). The action checks it first (FR-06). */
export const HONEYPOT_FIELD = "website";

export function isHoneypotFilled(formData: FormData): boolean {
  const value = formData.get(HONEYPOT_FIELD);
  if (value === null) return false;
  return typeof value === "string" ? value.trim() !== "" : true;
}

// --- Admin panel (F4) ---------------------------------------------------------------------

export const ADMIN_MESSAGES = {
  inquiryId: "La consulta no es válida",
  status: "Elegí un estado válido",
  notesTooLong: "Las notas pueden tener hasta 5000 caracteres",
} as const;

export const NOTES_MAX_LENGTH = 5000;

const inquiryIdSchema = z.uuid({ error: ADMIN_MESSAGES.inquiryId });

export const updateStatusSchema = z.object({
  id: inquiryIdSchema,
  status: z.enum(INQUIRY_STATUSES, { error: ADMIN_MESSAGES.status }),
});
export type UpdateStatusInput = z.output<typeof updateStatusSchema>;

/** Empty notes clear the field (null). */
export const updateNotesSchema = z.object({
  id: inquiryIdSchema,
  notes: z
    .string({ error: ADMIN_MESSAGES.notesTooLong })
    .trim()
    .max(NOTES_MAX_LENGTH, { error: ADMIN_MESSAGES.notesTooLong })
    .transform((value) => (value === "" ? null : value)),
});
export type UpdateNotesInput = z.output<typeof updateNotesSchema>;

/** Inquiries per page in the panel (US-06 CA2). */
export const INQUIRIES_PAGE_SIZE = 20;
export const SEARCH_MAX_LENGTH = 100;

/**
 * Panel list filters, read from the URL so they can be shared (US-06 CA2). Lenient on
 * purpose: an invalid or edited value is ignored (or falls back to page 1) instead of failing.
 */
export const listFiltersSchema = z.object({
  status: z.enum(INQUIRY_STATUSES).optional().catch(undefined),
  area: z.enum(PRACTICE_AREAS).optional().catch(undefined),
  urgency: z.enum(URGENCIES).optional().catch(undefined),
  q: z
    .string()
    .trim()
    .transform((value) => value.slice(0, SEARCH_MAX_LENGTH) || undefined)
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
export type ListFilters = z.output<typeof listFiltersSchema>;
