/**
 * Known domain errors of the inquiries feature (CLAUDE.md §4). Actions translate them into an
 * ActionResult; messages are for developers and logs, never shown to users, and never include
 * personal data.
 */

/**
 * - `store_failed`: database unavailable, constraint, timeout...
 * - `decrypt_failed`: a stored message or note did not decrypt (wrong key, tampered data or a
 *   row that was never encrypted, ADR-0017). Never shown as text.
 */
export type InquiryStoreErrorCode = "store_failed" | "decrypt_failed";

/** The inquiry could not be stored or read. `code` is safe to log (errorCode). */
export class InquiryStoreError extends Error {
  override readonly name = "InquiryStoreError";
  readonly code: InquiryStoreErrorCode;

  constructor(options?: { cause?: unknown; code?: InquiryStoreErrorCode }) {
    super("No se pudo guardar o leer la consulta.", { cause: options?.cause });
    this.code = options?.code ?? "store_failed";
  }
}

/** The code to log for any error: the store code, or undefined for anything else. */
export const storeErrorCode = (error: unknown): InquiryStoreErrorCode | undefined =>
  error instanceof InquiryStoreError ? error.code : undefined;

/** A caller passed metadata that breaks an invariant (e.g. a raw IP instead of its hash). */
export class InvalidInquiryInputError extends Error {
  override readonly name = "InvalidInquiryInputError";
}
