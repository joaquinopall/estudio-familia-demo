/**
 * FieldCipher with AES-256-GCM from node:crypto (F5-02, ADR-0017). No dependency.
 *
 * Stored format: `enc:v1:<key id>:<iv>:<ciphertext + 16-byte tag>`, both parts in base64url.
 * A random 12-byte IV per value; the context (table, column, row id) is the additional
 * authenticated data. The first key encrypts; every key decrypts (rotation).
 *
 * No `server-only`: it holds no secret by itself (keys come as a parameter), and the e2e
 * helpers use it to seed encrypted rows. The app takes it from adapters/index.ts.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import {
  type FieldCipher,
  type FieldCipherContext,
  FieldDecryptionError,
} from "../ports/field-cipher";
import type { FieldKey } from "../security/field-keys";

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

const aadOf = ({ table, column, rowId }: FieldCipherContext) =>
  Buffer.from(`${table}.${column}:${rowId}`, "utf8");

export function createAesGcmFieldCipher(keys: readonly FieldKey[]): FieldCipher {
  const current = keys[0];
  if (!current) throw new Error("FieldCipher necesita al menos una clave.");
  const byId = new Map(keys.map((entry) => [entry.id, entry.key]));

  return {
    encrypt(plaintext, context) {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, current.key, iv);
      cipher.setAAD(aadOf(context));
      const body = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
        cipher.getAuthTag(),
      ]);
      return `${PREFIX}${current.id}:${iv.toString("base64url")}:${body.toString("base64url")}`;
    },

    decrypt(stored, context) {
      if (!stored.startsWith(PREFIX)) throw new FieldDecryptionError("not_encrypted");
      const [keyId, ivPart, bodyPart, ...rest] = stored.slice(PREFIX.length).split(":");
      if (!keyId || !ivPart || !bodyPart || rest.length > 0) {
        throw new FieldDecryptionError("malformed");
      }
      const key = byId.get(keyId);
      if (!key) throw new FieldDecryptionError("unknown_key");

      const iv = Buffer.from(ivPart, "base64url");
      const body = Buffer.from(bodyPart, "base64url");
      if (iv.length !== IV_BYTES || body.length < TAG_BYTES) {
        throw new FieldDecryptionError("malformed");
      }
      try {
        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAAD(aadOf(context));
        decipher.setAuthTag(body.subarray(body.length - TAG_BYTES));
        return Buffer.concat([
          decipher.update(body.subarray(0, body.length - TAG_BYTES)),
          decipher.final(),
        ]).toString("utf8");
      } catch {
        // Wrong key, other row or column, or tampered data: GCM's tag does not verify.
        throw new FieldDecryptionError("corrupted");
      }
    },

    needsReencryption(stored) {
      return !stored.startsWith(`${PREFIX}${current.id}:`);
    },
  };
}
