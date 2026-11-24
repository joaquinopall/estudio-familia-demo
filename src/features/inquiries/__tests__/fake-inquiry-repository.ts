/**
 * In-memory InquiryRepository for service and action tests (SPEC §13). Stores the record and
 * its CREATED event together, like the Prisma repository; failWith() simulates a database error.
 */
import { randomUUID } from "node:crypto";

import { InquiryStoreError } from "@/features/inquiries/errors";
import type { InquiryRepository, NewInquiryRecord } from "@/features/inquiries/service";

export type StoredInquiry = NewInquiryRecord & {
  id: string;
  events: { type: "CREATED"; actorId: null }[];
};

export class FakeInquiryRepository implements InquiryRepository {
  readonly inquiries: StoredInquiry[] = [];
  private failure: Error | null = null;

  constructor(private readonly nextId: () => string = randomUUID) {}

  /** Makes the next writes throw this error (null to recover). */
  failWith(error: Error | null): void {
    this.failure = error;
  }

  async createWithCreatedEvent(record: NewInquiryRecord): Promise<{ id: string }> {
    if (this.failure) throw this.failure;
    const id = this.nextId();
    this.inquiries.push({ ...record, id, events: [{ type: "CREATED", actorId: null }] });
    return { id };
  }
}

export const storeError = () => new InquiryStoreError();
