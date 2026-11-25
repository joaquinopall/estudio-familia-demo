/**
 * Inquiry storage with Prisma (CLAUDE.md §3: the only place that touches Prisma for inquiries).
 * Implements the InquiryRepository the service declares.
 *
 * Errors: any Prisma failure becomes InquiryStoreError, so callers never depend on Prisma and
 * no Prisma message (which may contain values) reaches a log or a user.
 */
import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import { InquiryStoreError } from "./errors";
import type {
  InquiryListQuery,
  InquiryListRow,
  InquiryRepository,
  NewInquiryRecord,
} from "./service";

/** Only what the panel list shows (US-06 CA2): never the message, the phone or the notes. */
const LIST_SELECT = {
  id: true,
  createdAt: true,
  fullName: true,
  email: true,
  area: true,
  urgency: true,
  status: true,
  preferredChannel: true,
  safeToContact: true,
  emailIsPrivate: true,
} as const satisfies Prisma.InquirySelect;

/**
 * Prisma's `contains` becomes LIKE '%…%' without escaping, so % and _ in the text would act as
 * wildcards. Escaped with backslash, Postgres' default LIKE escape character.
 */
export const escapeLike = (text: string): string => text.replace(/[\\%_]/g, "\\$&");

function listWhere(query: InquiryListQuery): Prisma.InquiryWhereInput {
  const trimmed = query.search?.trim();
  const search = trimmed ? escapeLike(trimmed) : undefined;
  return {
    status: query.status,
    area: query.area,
    urgency: query.urgency,
    // Parameterized ILIKE on both columns. Emails are stored in lowercase (§8.1).
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search.toLowerCase() } },
          ],
        }
      : {}),
  };
}

async function guard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw new InquiryStoreError({ cause: error });
  }
}

export function createPrismaInquiryRepository(db: PrismaClient): InquiryRepository {
  return {
    createWithCreatedEvent: (record: NewInquiryRecord) =>
      // Nested write: Prisma runs it as one transaction, so the inquiry never exists without
      // its CREATED event (FR-07). The CREATED event has no actor.
      guard(() =>
        db.inquiry.create({
          data: { ...record, events: { create: { type: "CREATED" } } },
          select: { id: true },
        }),
      ),

    list: (query: InquiryListQuery) =>
      guard(async () => {
        const where = listWhere(query);
        // One transaction, so the total and the rows describe the same moment.
        const [total, rows] = await db.$transaction([
          db.inquiry.count({ where }),
          db.inquiry.findMany({
            where,
            select: LIST_SELECT,
            // Uses the (status|area, createdAt) and createdAt indexes (§7, NFR-ESC-01).
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: query.skip,
            take: query.take,
          }),
        ]);
        return { total, rows: rows satisfies InquiryListRow[] };
      }),
  };
}
