/**
 * In-memory InquiryRepository for service and action tests (SPEC §13). Stores the record and
 * its CREATED event together, like the Prisma repository; failWith() simulates a database error.
 * The list works on `listRows` (seeded by tests) with the same order and filters as the database.
 */
import { randomUUID } from "node:crypto";

import { InquiryStoreError } from "@/features/inquiries/errors";
import type {
  InquiryDetailRow,
  InquiryEventRow,
  InquiryListQuery,
  InquiryListRow,
  InquiryRepository,
  NewInquiryRecord,
  NotesChangeResult,
  StatusChangeResult,
} from "@/features/inquiries/service";
import type { InquiryStatus } from "@/features/inquiries/types";

export type StoredInquiry = NewInquiryRecord & {
  id: string;
  events: { type: "CREATED"; actorId: null }[];
};

function matches(row: InquiryListRow, query: InquiryListQuery): boolean {
  const search = query.search?.trim().toLowerCase();
  return (
    (!query.status || row.status === query.status) &&
    (!query.area || row.area === query.area) &&
    (!query.urgency || row.urgency === query.urgency) &&
    (!search ||
      row.fullName.toLowerCase().includes(search) ||
      row.email.toLowerCase().includes(search))
  );
}

/** createdAt desc, then id desc: the database's order. */
const newestFirst = (a: InquiryListRow, b: InquiryListRow) =>
  b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

export class FakeInquiryRepository implements InquiryRepository {
  readonly inquiries: StoredInquiry[] = [];
  readonly listRows: InquiryListRow[] = [];
  readonly listQueries: InquiryListQuery[] = [];
  /** Detail rows by id (seeded with addDetail); updates change them and append events. */
  readonly details = new Map<string, InquiryDetailRow>();
  /** StaffMember names by id, to resolve actors like the database does. */
  readonly staffNames = new Map<string, string>();
  private failure: Error | null = null;
  private eventSeq = 0;
  private now = new Date("2026-11-25T18:00:00.000Z");

  addDetail(row: InquiryDetailRow): InquiryDetailRow {
    this.details.set(row.id, row);
    return row;
  }

  private nextEvent(
    fields: Pick<InquiryEventRow, "type" | "fromStatus" | "toStatus" | "actorId">,
  ): InquiryEventRow {
    this.now = new Date(this.now.getTime() + 60_000);
    return {
      id: `event-${++this.eventSeq}`,
      createdAt: this.now,
      ...fields,
      actorName: fields.actorId ? (this.staffNames.get(fields.actorId) ?? null) : null,
    };
  }

  async findById(id: string): Promise<InquiryDetailRow | null> {
    if (this.failure) throw this.failure;
    const row = this.details.get(id);
    return row ? structuredClone(row) : null;
  }

  async updateStatus(
    id: string,
    status: InquiryStatus,
    actorId: string,
  ): Promise<StatusChangeResult> {
    if (this.failure) throw this.failure;
    const row = this.details.get(id);
    if (!row) return { result: "not_found" };
    if (row.status === status) return { result: "unchanged" };
    const from = row.status;
    row.status = status;
    row.events.push(
      this.nextEvent({ type: "STATUS_CHANGED", fromStatus: from, toStatus: status, actorId }),
    );
    return { result: "changed", from, to: status };
  }

  async updateNotes(id: string, notes: string | null, actorId: string): Promise<NotesChangeResult> {
    if (this.failure) throw this.failure;
    const row = this.details.get(id);
    if (!row) return { result: "not_found" };
    if (row.internalNotes === notes) return { result: "unchanged", updatedAt: row.updatedAt };
    row.internalNotes = notes;
    const event = this.nextEvent({
      type: "NOTES_UPDATED",
      fromStatus: null,
      toStatus: null,
      actorId,
    });
    row.updatedAt = event.createdAt;
    row.events.push(event);
    return { result: "changed", updatedAt: row.updatedAt };
  }

  constructor(private readonly nextId: () => string = randomUUID) {}

  /** Makes the next calls throw this error (null to recover). */
  failWith(error: Error | null): void {
    this.failure = error;
  }

  async createWithCreatedEvent(record: NewInquiryRecord): Promise<{ id: string }> {
    if (this.failure) throw this.failure;
    const id = this.nextId();
    this.inquiries.push({ ...record, id, events: [{ type: "CREATED", actorId: null }] });
    return { id };
  }

  async list(query: InquiryListQuery): Promise<{ rows: InquiryListRow[]; total: number }> {
    if (this.failure) throw this.failure;
    this.listQueries.push(query);
    const found = this.listRows.filter((row) => matches(row, query)).sort(newestFirst);
    return { total: found.length, rows: found.slice(query.skip, query.skip + query.take) };
  }
}

export const storeError = () => new InquiryStoreError();
