/**
 * Validation of the auth feature (NFR-SEC-01):
 * - signInSchema: the staff login (SPEC §6.5). It only checks the shape: whether the
 *   credentials are right is decided by Supabase.
 * - staffMemberInputSchema: the input of `npm run staff:add` (SPEC §7).
 *
 * The 12-character minimum of NFR-SEC-10 is enforced by Supabase Auth when the password is
 * set, not here: an existing staff member must always be able to try to sign in.
 */
import { z } from "zod";

// Same reason as in features/inquiries/schema.ts: no `new Function` probe under an enforced
// CSP if this schema is ever used in the browser (today the login validates on the server only).
z.config({ jitless: true });

export const EMAIL_MAX_LENGTH = 254;
/** Upper bound so nobody sends megabytes; Supabase uses at most 72 bytes of a password. */
export const PASSWORD_MAX_LENGTH = 256;
export const FULL_NAME_MIN_LENGTH = 2;
export const FULL_NAME_MAX_LENGTH = 120;

/** Trimmed, lowercase and valid, like the inquiry form; one message for every failure. */
const normalizedEmail = (message: string) =>
  z
    .string({ error: message })
    .trim()
    .toLowerCase()
    .refine((value) => value.length <= EMAIL_MAX_LENGTH && z.regexes.email.test(value), {
      error: message,
    });

export const signInMessages = {
  email: "Ingresá un email válido",
  password: "Ingresá tu contraseña",
} as const;

export const signInSchema = z.object({
  email: normalizedEmail(signInMessages.email),
  // Never trimmed: spaces can be part of a password.
  password: z
    .string({ error: signInMessages.password })
    .min(1, { error: signInMessages.password })
    .max(PASSWORD_MAX_LENGTH, { error: signInMessages.password }),
});

export type SignInInput = z.input<typeof signInSchema>;
export type SignInData = z.output<typeof signInSchema>;

/** Messages for the person running the script, so they name its flags. */
export const staffMemberMessages = {
  email: "Pasá un email válido con --email",
  fullName: `Pasá el nombre con --name (entre ${FULL_NAME_MIN_LENGTH} y ${FULL_NAME_MAX_LENGTH} caracteres)`,
} as const;

export const staffMemberInputSchema = z.object({
  email: normalizedEmail(staffMemberMessages.email),
  fullName: z
    .string({ error: staffMemberMessages.fullName })
    .trim()
    .min(FULL_NAME_MIN_LENGTH, { error: staffMemberMessages.fullName })
    .max(FULL_NAME_MAX_LENGTH, { error: staffMemberMessages.fullName }),
});

export type StaffMemberInput = z.output<typeof staffMemberInputSchema>;
