/**
 * Data retention (SPEC §7, NFR-PRIV-01, privacy policy "Cuánto tiempo los guardamos").
 *
 * A closed or discarded inquiry is deleted RETENTION_MONTHS after it was closed or discarded
 * (`npm run inquiries:purge`). Open ones are never deleted, only reported when they were
 * created longer ago than that. Change it only together with the privacy policy text and its
 * version: the policy promises this number.
 */
export const RETENTION_MONTHS = 24;
