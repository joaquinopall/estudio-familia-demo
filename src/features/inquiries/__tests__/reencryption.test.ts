import { describe, expect, it } from "vitest";

import {
  type ReencryptionStore,
  type StoredTextFields,
  type TextFieldsUpdate,
  planRow,
  reencryptInquiries,
} from "@/features/inquiries/reencryption";
import { createAesGcmFieldCipher } from "@/lib/adapters/aes-gcm-field-cipher";
import { FieldDecryptionError } from "@/lib/ports/field-cipher";

import { createTestFieldCipher } from "./test-field-cipher";

const UPDATED_AT = new Date("2026-11-20T10:00:00Z");
const at = (rowId: string, column: "message" | "internal_notes") => ({
  table: "inquiries",
  column,
  rowId,
});

/** In-memory rows, by id, with the updates it received. */
class MemoryStore implements ReencryptionStore {
  readonly updates: TextFieldsUpdate[] = [];
  constructor(readonly rows: StoredTextFields[]) {}

  async page(afterId: string | null, take: number) {
    return this.rows
      .filter((row) => afterId === null || row.id > afterId)
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, take);
  }

  async update(change: TextFieldsUpdate) {
    this.updates.push(change);
    const row = this.rows.find((r) => r.id === change.id);
    if (row) Object.assign(row, change);
  }
}

describe("planRow", () => {
  const cipher = createTestFieldCipher("k2");

  it("encrypts plain text, bound to its row and column, keeping updatedAt", () => {
    const row = {
      id: "a",
      message: "Necesito ayuda",
      internalNotes: "Llamar el lunes",
      updatedAt: UPDATED_AT,
    };

    const { update, plain, oldKey } = planRow(cipher, row);

    expect({ plain, oldKey }).toEqual({ plain: 2, oldKey: 0 });
    expect(update?.updatedAt).toBe(UPDATED_AT);
    expect(cipher.decrypt(update?.message ?? "", at("a", "message"))).toBe("Necesito ayuda");
    expect(cipher.decrypt(update?.internalNotes ?? "", at("a", "internal_notes"))).toBe(
      "Llamar el lunes",
    );
  });

  it("re-encrypts a value of an old key with the current one", () => {
    const k1 = { id: "k1", key: Buffer.alloc(32, 1) };
    const old = createAesGcmFieldCipher([k1]);
    const rotated = createAesGcmFieldCipher([{ id: "k2", key: Buffer.alloc(32, 2) }, k1]);
    const row = {
      id: "a",
      message: old.encrypt("Hola", at("a", "message")),
      internalNotes: null,
      updatedAt: UPDATED_AT,
    };

    const { update, oldKey } = planRow(rotated, row);

    expect(oldKey).toBe(1);
    expect(update?.message).toMatch(/^enc:v1:k2:/);
    expect(update).not.toHaveProperty("internalNotes");
    expect(rotated.decrypt(update?.message ?? "", at("a", "message"))).toBe("Hola");
  });

  it("leaves current values and null notes alone", () => {
    const row = {
      id: "a",
      message: cipher.encrypt("Hola", at("a", "message")),
      internalNotes: null,
      updatedAt: UPDATED_AT,
    };
    expect(planRow(cipher, row)).toEqual({ update: null, plain: 0, oldKey: 0 });
  });

  it("refuses to overwrite a value it cannot read (unknown key)", () => {
    const foreign = createTestFieldCipher("zz").encrypt("x", at("a", "message"));
    const row = { id: "a", message: foreign, internalNotes: null, updatedAt: UPDATED_AT };

    expect(() =>
      planRow(createAesGcmFieldCipher([{ id: "k2", key: Buffer.alloc(32) }]), row),
    ).toThrow(FieldDecryptionError);
  });
});

describe("reencryptInquiries", () => {
  const rows = () =>
    ["c", "a", "b"].map((id) => ({
      id,
      message: `Mensaje ${id}`,
      internalNotes: null,
      updatedAt: UPDATED_AT,
    }));

  it("only counts without apply (dry run)", async () => {
    const store = new MemoryStore(rows());

    const counts = await reencryptInquiries(
      { cipher: createTestFieldCipher(), store },
      { apply: false },
    );

    expect(counts).toEqual({ rows: 3, plain: 3, oldKey: 0, updated: 0 });
    expect(store.updates).toEqual([]);
  });

  it("walks every page, and a second run changes nothing (idempotent)", async () => {
    const cipher = createTestFieldCipher();
    const store = new MemoryStore(rows());

    const first = await reencryptInquiries({ cipher, store }, { apply: true, pageSize: 2 });
    const second = await reencryptInquiries({ cipher, store }, { apply: true, pageSize: 2 });

    expect(first).toEqual({ rows: 3, plain: 3, oldKey: 0, updated: 3 });
    expect(second).toEqual({ rows: 3, plain: 0, oldKey: 0, updated: 0 });
    expect(store.rows.every((row) => row.message.startsWith("enc:v1:test:"))).toBe(true);
  });
});
