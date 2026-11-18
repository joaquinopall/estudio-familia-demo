/**
 * Result contract for every Server Action (SPEC §6.5).
 * Messages shown to users are generic and in Spanish; never internal details.
 */
import { z } from "zod";

export type ActionErrorCode =
  | "VALIDATION"
  | "RATE_LIMITED"
  | "CAPTCHA_FAILED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL";

export type FieldErrors = Record<string, string[]>;

export type ActionError = {
  code: ActionErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
};

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

export const DEFAULT_ERROR_MESSAGES: Record<ActionErrorCode, string> = {
  VALIDATION: "Revisá los datos marcados e intentá de nuevo.",
  RATE_LIMITED: "Hiciste demasiados intentos seguidos. Esperá unos minutos y volvé a probar.",
  CAPTCHA_FAILED: "No pudimos verificar que no seas un robot. Intentá de nuevo.",
  UNAUTHORIZED: "Tenés que iniciar sesión para continuar.",
  FORBIDDEN: "No tenés permiso para realizar esta acción.",
  NOT_FOUND: "No encontramos lo que buscabas.",
  INTERNAL: "Ocurrió un error inesperado. Intentá de nuevo en unos minutos.",
};

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export function fail<T = never>(
  code: ActionErrorCode,
  message: string = DEFAULT_ERROR_MESSAGES[code],
  fieldErrors?: FieldErrors,
): ActionResult<T> {
  return {
    ok: false,
    error: fieldErrors ? { code, message, fieldErrors } : { code, message },
  };
}

/** Turns a Zod error into a VALIDATION result with one list of messages per field. */
export function validationFailure<T = never>(
  error: z.ZodError,
  message: string = DEFAULT_ERROR_MESSAGES.VALIDATION,
): ActionResult<T> {
  const { fieldErrors } = z.flattenError(error);
  const cleaned: FieldErrors = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      cleaned[field] = messages;
    }
  }
  return fail("VALIDATION", message, cleaned);
}
