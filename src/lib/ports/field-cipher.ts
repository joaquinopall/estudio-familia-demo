/**
 * Port for encrypting stored text fields (F5-02, ADR-0017): the inquiry message and the
 * internal notes. Adapter: lib/adapters/aes-gcm-field-cipher.ts.
 *
 * Unlike the network ports (ADR-0013), decrypt() throws: a value that does not decrypt is not
 * a provider outage but a wrong key or tampered data, and must never be shown as text.
 */

/**
 * Binds a ciphertext to where it is stored (table, column and row id), as additional
 * authenticated data: a value copied to another row or column does not decrypt.
 */
export type FieldCipherContext = { table: string; column: string; rowId: string };

export interface FieldCipher {
  /** Returns the stored form (`enc:v1:<key id>:…`), different on every call. */
  encrypt(plaintext: string, context: FieldCipherContext): string;
  /** Returns the original text, or throws FieldDecryptionError. */
  decrypt(stored: string, context: FieldCipherContext): string;
  /** True when the value is plain text or uses a key other than the current one. */
  needsReencryption(stored: string): boolean;
}

export type FieldDecryptionReason = "not_encrypted" | "unknown_key" | "malformed" | "corrupted";

/** Never carries the stored value nor the plaintext. */
export class FieldDecryptionError extends Error {
  override readonly name = "FieldDecryptionError";

  constructor(readonly reason: FieldDecryptionReason) {
    super(`No se pudo descifrar el campo (${reason}).`);
  }
}
