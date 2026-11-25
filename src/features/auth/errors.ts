/**
 * Known domain errors of the auth feature (CLAUDE.md §4). Messages are for developers and
 * logs, never shown to users, and never include personal data.
 */

/** Staff data could not be read or written (database unavailable, constraint, permission...). */
export class StaffStoreError extends Error {
  override readonly name = "StaffStoreError";

  constructor(options?: { cause?: unknown }) {
    super("No se pudo leer o guardar el staff.", options);
  }
}
