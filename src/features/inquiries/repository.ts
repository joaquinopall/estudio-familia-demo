/**
 * Inquiry storage with Prisma (CLAUDE.md §3: the only place that touches Prisma for inquiries).
 * Implements the InquiryRepository the service declares.
 *
 * Errors: any Prisma failure becomes InquiryStoreError, so callers never depend on Prisma and
 * no Prisma message (which may contain values) reaches a log or a user.
 */
import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

import { InquiryStoreError } from "./errors";
import type { InquiryRepository, NewInquiryRecord } from "./service";

export function createPrismaInquiryRepository(db: PrismaClient): InquiryRepository {
  return {
    async createWithCreatedEvent(record: NewInquiryRecord) {
      try {
        // Nested write: Prisma runs it as one transaction, so the inquiry never exists
        // without its CREATED event (FR-07). The CREATED event has no actor.
        return await db.inquiry.create({
          data: {
            ...record,
            events: { create: { type: "CREATED" } },
          },
          select: { id: true },
        });
      } catch (error) {
        throw new InquiryStoreError({ cause: error });
      }
    },
  };
}
