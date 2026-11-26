import { describe, expect, it } from "vitest";

import { parseFieldEncryptionKeys } from "@/lib/security/field-keys";

const b64 = (bytes: number, fill = 1) => Buffer.alloc(bytes, fill).toString("base64");

describe("parseFieldEncryptionKeys (ADR-0017)", () => {
  it("parses one key", () => {
    const parsed = parseFieldEncryptionKeys(`k1:${b64(32)}`);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.keys.map((k) => k.id)).toEqual(["k1"]);
      expect(parsed.keys[0]?.key).toHaveLength(32);
    }
  });

  it("keeps the order: the first one encrypts, the rest decrypt", () => {
    const parsed = parseFieldEncryptionKeys(` k2:${b64(32, 2)} , k1:${b64(32, 1)} `);
    expect(parsed.ok && parsed.keys.map((k) => k.id)).toEqual(["k2", "k1"]);
  });

  it.each([
    ["empty", "", "al menos una clave"],
    ["only commas", " , ", "al menos una clave"],
    ["no id", b64(32), "falta el id"],
    ["bad id", `k-1:${b64(32)}`, "falta el id"],
    ["not base64", "k1:no es base64!", "no es base64"],
    ["16 bytes", `k1:${b64(16)}`, "32 bytes"],
    ["repeated id", `k1:${b64(32)},k1:${b64(32, 2)}`, "repetido"],
  ])("rejects %s", (_name, raw, error) => {
    const parsed = parseFieldEncryptionKeys(raw);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain(error);
  });

  it("never echoes the key material in the error", () => {
    const material = b64(16, 9);
    const parsed = parseFieldEncryptionKeys(`k1:${material}`);
    expect(!parsed.ok && parsed.error).not.toContain(material);
  });
});
