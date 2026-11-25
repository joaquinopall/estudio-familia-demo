/**
 * What the person typed in the inquiry form, as strings (US-03 CA4: nothing is lost when the
 * submission fails). The action sends them back with any error, and the form uses them as
 * default values: React 19 resets the form after each submission, and without JavaScript the
 * page is rendered again from scratch.
 *
 * Only the form's own fields: never the Turnstile token (single use) nor the honeypot.
 */

export const INQUIRY_FORM_FIELDS = [
  "area",
  "urgency",
  "message",
  "fullName",
  "email",
  "phone",
  "preferredChannel",
  "safeToContact",
  "emailIsPrivate",
  "consent",
] as const;

export type InquiryFormField = (typeof INQUIRY_FORM_FIELDS)[number];
export type InquiryFormValues = Partial<Record<InquiryFormField, string>>;

/** Longer than any valid value: enough to give back what was typed, not more. */
const MAX_ECHO_LENGTH = 5000;

export function extractFormValues(formData: FormData): InquiryFormValues {
  const values: InquiryFormValues = {};
  for (const field of INQUIRY_FORM_FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string" && value !== "") {
      values[field] = value.slice(0, MAX_ECHO_LENGTH);
    }
  }
  return values;
}
