/**
 * Known domain errors of the inquiries feature (CLAUDE.md §4). Actions translate them into an
 * ActionResult; messages are for developers and logs, never shown to users, and never include
 * personal data.
 */

/** The inquiry could not be stored (database unavailable, constraint, timeout...). */
export class InquiryStoreError extends Error {
  override readonly name = "InquiryStoreError";

  constructor(options?: { cause?: unknown }) {
    super("No se pudo guardar la consulta.", options);
  }
}

/** A caller passed metadata that breaks an invariant (e.g. a raw IP instead of its hash). */
export class InvalidInquiryInputError extends Error {
  override readonly name = "InvalidInquiryInputError";
}
