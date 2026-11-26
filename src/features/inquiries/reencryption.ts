/**
 * Encrypts stored messages and notes that are still plain text, and re-encrypts with the
 * current key the ones that use an older one (F5-02, ADR-0017). Used by
 * `npm run inquiries:encrypt`. Idempotent: a second run changes nothing.
 *
 * Pure: the storage comes as a parameter (repository.ts implements it with Prisma).
 */
import type { FieldCipher, FieldCipherContext } from "@/lib/ports/field-cipher";
import { FieldDecryptionError } from "@/lib/ports/field-cipher";

export type StoredTextFields = {
  id: string;
  message: string;
  internalNotes: string | null;
  updatedAt: Date;
};

/** `updatedAt` is written back as it was: re-encrypting is not a change of the inquiry. */
export type TextFieldsUpdate = {
  id: string;
  updatedAt: Date;
  message?: string;
  internalNotes?: string;
};

export interface ReencryptionStore {
  /** Up to `take` rows with an id greater than `afterId` (all rows when null), by id. */
  page(afterId: string | null, take: number): Promise<StoredTextFields[]>;
  /** Writes only the given fields, keeping updatedAt. */
  update(change: TextFieldsUpdate): Promise<void>;
}

export type ReencryptionCounts = { rows: number; plain: number; oldKey: number; updated: number };

const contextOf = (rowId: string, column: "message" | "internal_notes"): FieldCipherContext => ({
  table: "inquiries",
  column,
  rowId,
});

/** The text of a stored value: plain text as is, or decrypted with any known key. */
function textOf(cipher: FieldCipher, stored: string, context: FieldCipherContext): string {
  try {
    return cipher.decrypt(stored, context);
  } catch (error) {
    if (error instanceof FieldDecryptionError && error.reason === "not_encrypted") return stored;
    throw error; // unknown key or tampered: never overwrite what cannot be read
  }
}

/** What to write for one row, and whether each field was plain or used an old key. */
export function planRow(
  cipher: FieldCipher,
  row: StoredTextFields,
): { update: TextFieldsUpdate | null; plain: number; oldKey: number } {
  const update: TextFieldsUpdate = { id: row.id, updatedAt: row.updatedAt };
  let plain = 0;
  let oldKey = 0;

  const fields = [
    ["message", row.message, "message"],
    ["internalNotes", row.internalNotes, "internal_notes"],
  ] as const;
  for (const [field, stored, column] of fields) {
    if (stored === null || !cipher.needsReencryption(stored)) continue;
    const context = contextOf(row.id, column);
    if (stored.startsWith("enc:")) oldKey += 1;
    else plain += 1;
    update[field] = cipher.encrypt(textOf(cipher, stored, context), context);
  }

  const changed = update.message !== undefined || update.internalNotes !== undefined;
  return { update: changed ? update : null, plain, oldKey };
}

/**
 * Walks every row in pages. With `apply: false` it only counts (dry run). Stops at the first
 * value it cannot read (FieldDecryptionError): nothing is overwritten with garbage.
 */
export async function reencryptInquiries(
  deps: { cipher: FieldCipher; store: ReencryptionStore },
  options: { apply: boolean; pageSize?: number },
): Promise<ReencryptionCounts> {
  const take = options.pageSize ?? 100;
  const counts: ReencryptionCounts = { rows: 0, plain: 0, oldKey: 0, updated: 0 };
  let afterId: string | null = null;

  for (;;) {
    const rows = await deps.store.page(afterId, take);
    if (rows.length === 0) return counts;
    for (const row of rows) {
      counts.rows += 1;
      const plan = planRow(deps.cipher, row);
      counts.plain += plan.plain;
      counts.oldKey += plan.oldKey;
      if (plan.update && options.apply) {
        await deps.store.update(plan.update);
        counts.updated += 1;
      }
    }
    afterId = rows.at(-1)?.id ?? null;
  }
}
