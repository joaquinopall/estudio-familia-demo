/**
 * Validation of the staff login (SPEC §6.5, NFR-SEC-01). It only checks the shape: whether the
 * credentials are right is decided by Supabase, and the error never says which field failed.
 *
 * The 12-character minimum of NFR-SEC-10 is enforced by Supabase Auth when the password is
 * set, not here: an existing staff member must always be able to try to sign in.
 */
import { z } from "zod";

// Same reason as in features/inquiries/schema.ts: no `new Function` probe under an enforced
// CSP when the login form validates in the browser (F4-03).
z.config({ jitless: true });

export const EMAIL_MAX_LENGTH = 254;
/** Upper bound so nobody sends megabytes; Supabase uses at most 72 bytes of a password. */
export const PASSWORD_MAX_LENGTH = 256;

export const signInMessages = {
  email: "Ingresá un email válido",
  password: "Ingresá tu contraseña",
} as const;

export const signInSchema = z.object({
  email: z
    .string({ error: signInMessages.email })
    .trim()
    .toLowerCase()
    .refine((value) => value.length <= EMAIL_MAX_LENGTH && z.regexes.email.test(value), {
      error: signInMessages.email,
    }),
  // Never trimmed: spaces can be part of a password.
  password: z
    .string({ error: signInMessages.password })
    .min(1, { error: signInMessages.password })
    .max(PASSWORD_MAX_LENGTH, { error: signInMessages.password }),
});

export type SignInInput = z.input<typeof signInSchema>;
export type SignInData = z.output<typeof signInSchema>;
