/**
 * FIELD_ENCRYPTION_KEYS (SPEC §9, ADR-0017): one or more `id:base64` keys separated by commas.
 * The first one encrypts; the rest only decrypt, so a key can be rotated (add the new one in
 * front, run `npm run inquiries:encrypt -- --confirm`, then remove the old one).
 *
 * Pure module: no `server-only` and no `@/` alias, because env.schema.ts (and so
 * next.config.ts) imports it. Error messages never include the key material.
 */

export type FieldKey = { id: string; key: Buffer };

export type ParsedFieldKeys = { ok: true; keys: FieldKey[] } | { ok: false; error: string };

/** AES-256 needs exactly 32 bytes. */
export const FIELD_KEY_BYTES = 32;

/** Short and safe inside the stored format `enc:v1:<id>:…`. */
const KEY_ID = /^[A-Za-z0-9]{1,16}$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function parseFieldEncryptionKeys(raw: string): ParsedFieldKeys {
  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
  if (entries.length === 0) return { ok: false, error: "necesita al menos una clave" };

  const keys: FieldKey[] = [];
  for (const [index, entry] of entries.entries()) {
    const position = `clave ${index + 1}`;
    const separator = entry.indexOf(":");
    const id = separator === -1 ? "" : entry.slice(0, separator);
    const material = separator === -1 ? "" : entry.slice(separator + 1);

    if (!KEY_ID.test(id)) {
      return {
        ok: false,
        error: `${position}: falta el id (formato id:base64, id de 1 a 16 letras o números)`,
      };
    }
    if (keys.some((key) => key.id === id)) {
      return { ok: false, error: `${position}: el id "${id}" está repetido` };
    }
    if (!BASE64.test(material)) {
      return { ok: false, error: `${position} ("${id}"): no es base64 válido` };
    }
    const key = Buffer.from(material, "base64");
    if (key.length !== FIELD_KEY_BYTES) {
      return {
        ok: false,
        error: `${position} ("${id}"): tiene que tener ${FIELD_KEY_BYTES} bytes`,
      };
    }
    keys.push({ id, key });
  }
  return { ok: true, keys };
}
