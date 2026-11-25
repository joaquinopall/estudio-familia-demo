/**
 * Client-side checks of the inquiry form, with the same schema the server uses (FR-05).
 * Only to show errors sooner: the server always validates again (NFR-SEC-01).
 */
import { inquirySchema } from "../schema";

/** First message of each invalid field. */
export type FieldErrorMap = Partial<Record<string, string>>;

export type Step = "details" | "contact";

/** Fields of step 1; the rest belong to step 2. */
export const DETAILS_FIELDS: ReadonlySet<string> = new Set(["area", "urgency", "message"]);

export function firstMessages(fieldErrors?: Record<string, string[]>): FieldErrorMap {
  const map: FieldErrorMap = {};
  for (const [field, messages] of Object.entries(fieldErrors ?? {})) map[field] = messages[0];
  return map;
}

/** Validates the whole form (or only some fields) as the server would. */
export function validateForm(form: HTMLFormElement, only?: ReadonlySet<string>): FieldErrorMap {
  const result = inquirySchema.safeParse(Object.fromEntries(new FormData(form)));
  if (result.success) return {};
  const errors: FieldErrorMap = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    if ((!only || only.has(field)) && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** The step to show for a set of errors: step 1 if any of its fields failed. */
export const stepOf = (errors: FieldErrorMap): Step =>
  Object.keys(errors).some((field) => DETAILS_FIELDS.has(field)) ? "details" : "contact";
