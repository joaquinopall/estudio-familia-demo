/**
 * In-memory InquiryRepository for service and action tests (SPEC §13). Stores the record and
 * its CREATED event together, like the Prisma repository; failWith() simulates a database error.
 * The list works on `listRows` (seeded by tests) with the same order and filters as the database.
 */
import { randomUUID } from "node:crypto";

import { InquiryStoreError } from "@/features/inquiries/errors";
import type {
  InquiryListQuery,
  InquiryListRow,
  InquiryRepository,
  NewInquiryRecord,
} from "@/features/inquiries/service";

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
  private failure: Error | null = null;

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
