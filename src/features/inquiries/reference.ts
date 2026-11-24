/**
 * Readable reference number of an inquiry (FR-09): "C-" + the first 8 characters of its UUID,
 * uppercase. Example: 7f3a9b21-... → "C-7F3A9B21".
 *
 * It is for showing and searching, not an identifier: 8 hex characters are ~4.3 billion
 * values, so two inquiries could share one. The real identifier is the UUID.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const REFERENCE_PREFIX = "C-";

export function toReference(id: string): string {
  if (!UUID_PATTERN.test(id)) throw new Error("toReference: el id de la consulta no es un UUID.");
  return `${REFERENCE_PREFIX}${id.slice(0, 8).toUpperCase()}`;
}
