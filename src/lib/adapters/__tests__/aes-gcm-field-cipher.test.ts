import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createAesGcmFieldCipher } from "@/lib/adapters/aes-gcm-field-cipher";
import { FieldDecryptionError } from "@/lib/ports/field-cipher";
import type { FieldKey } from "@/lib/security/field-keys";

const key = (id: string): FieldKey => ({ id, key: randomBytes(32) });
const k1 = key("k1");
const k2 = key("k2");

const MESSAGE = "Mi expareja no me deja ver a mis hijos. Tengo audiencia el 3/12 — ¿qué hago?";
const context = {
  table: "inquiries",
  column: "message",
  rowId: "7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b",
};

function reasonOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(FieldDecryptionError);
    return (error as FieldDecryptionError).reason;
  }
  throw new Error("expected FieldDecryptionError");
}

describe("createAesGcmFieldCipher (ADR-0017)", () => {
  const cipher = createAesGcmFieldCipher([k1]);

  it("round-trips text with accents, emoji and line breaks", () => {
    const text = `${MESSAGE}\nSegunda línea 🙂`;
    expect(cipher.decrypt(cipher.encrypt(text, context), context)).toBe(text);
  });

  it("stores the versioned format with the key id, never the text", () => {
    const stored = cipher.encrypt(MESSAGE, context);

    expect(stored).toMatch(/^enc:v1:k1:[A-Za-z0-9_-]{16}:[A-Za-z0-9_-]+$/);
    expect(stored).not.toContain("hijos");
  });

  it("gives a different ciphertext every time (random IV)", () => {
    expect(cipher.encrypt(MESSAGE, context)).not.toBe(cipher.encrypt(MESSAGE, context));
  });

  it("does not decrypt in another row or another column (context is authenticated)", () => {
    const stored = cipher.encrypt(MESSAGE, context);

    expect(reasonOf(() => cipher.decrypt(stored, { ...context, rowId: "otra-fila" }))).toBe(
      "corrupted",
    );
    expect(reasonOf(() => cipher.decrypt(stored, { ...context, column: "internal_notes" }))).toBe(
      "corrupted",
    );
  });

  it("detects tampering", () => {
    const stored = cipher.encrypt(MESSAGE, context);
    const last = stored.at(-1) === "A" ? "B" : "A";
    expect(reasonOf(() => cipher.decrypt(stored.slice(0, -1) + last, context))).toBe("corrupted");
  });

  it("rejects plain text, malformed values and unknown keys", () => {
    expect(reasonOf(() => cipher.decrypt(MESSAGE, context))).toBe("not_encrypted");
    expect(reasonOf(() => cipher.decrypt("enc:v1:k1:solo-dos", context))).toBe("malformed");
    expect(reasonOf(() => cipher.decrypt("enc:v1:k1:AAAA:BBBB", context))).toBe("malformed");
    const other = createAesGcmFieldCipher([k2]).encrypt(MESSAGE, context);
    expect(reasonOf(() => cipher.decrypt(other, context))).toBe("unknown_key");
  });

  it("never puts the text in the error", () => {
    try {
      cipher.decrypt(MESSAGE, context);
    } catch (error) {
      expect(String(error)).not.toContain("hijos");
    }
  });

  describe("key rotation", () => {
    const old = createAesGcmFieldCipher([k1]);
    const rotated = createAesGcmFieldCipher([k2, k1]);

    it("encrypts with the first key and still decrypts the old one", () => {
      const before = old.encrypt(MESSAGE, context);
      const after = rotated.encrypt(MESSAGE, context);

      expect(after.startsWith("enc:v1:k2:")).toBe(true);
      expect(rotated.decrypt(before, context)).toBe(MESSAGE);
      expect(rotated.decrypt(after, context)).toBe(MESSAGE);
    });

    it("says which values need re-encryption: plain text or an old key", () => {
      expect(rotated.needsReencryption(MESSAGE)).toBe(true);
      expect(rotated.needsReencryption(old.encrypt(MESSAGE, context))).toBe(true);
      expect(rotated.needsReencryption(rotated.encrypt(MESSAGE, context))).toBe(false);
    });
  });

  it("needs at least one key", () => {
    expect(() => createAesGcmFieldCipher([])).toThrow();
  });
});
