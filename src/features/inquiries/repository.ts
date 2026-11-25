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
  InquiryDetailRow,
  InquiryListQuery,
  InquiryListRow,
  InquiryRepository,
  NewInquiryRecord,
  NotesChangeResult,
  StatusChangeResult,
} from "./service";
import type { InquiryStatus } from "./types";

/** Everything the detail shows. Never the ipHash (NFR-SEC-06). */
const DETAIL_SELECT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  fullName: true,
  email: true,
  phone: true,
  area: true,
  urgency: true,
  message: true,
  preferredChannel: true,
  safeToContact: true,
  emailIsPrivate: true,
  consentAt: true,
  privacyPolicyVersion: true,
  status: true,
  internalNotes: true,
  source: true,
  events: {
    select: {
      id: true,
      type: true,
      createdAt: true,
      fromStatus: true,
      toStatus: true,
      actorId: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
} as const satisfies Prisma.InquirySelect;

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

    findById: (id: string) =>
      guard(async (): Promise<InquiryDetailRow | null> => {
        const inquiry = await db.inquiry.findUnique({ where: { id }, select: DETAIL_SELECT });
        if (!inquiry) return null;

        // actor_id has no foreign key (SPEC §7): names are looked up apart, and a missing
        // member stays null.
        const actorIds = [
          ...new Set(inquiry.events.flatMap((event) => (event.actorId ? [event.actorId] : []))),
        ];
        const staff = actorIds.length
          ? await db.staffMember.findMany({
              where: { id: { in: actorIds } },
              select: { id: true, fullName: true },
            })
          : [];
        const names = new Map(staff.map((member) => [member.id, member.fullName]));

        return {
          ...inquiry,
          events: inquiry.events.map((event) => ({
            ...event,
            actorName: event.actorId ? (names.get(event.actorId) ?? null) : null,
          })),
        };
      }),

    updateStatus: (id: string, status: InquiryStatus, actorId: string) =>
      guard(() =>
        // Interactive transaction: the status read and the event written are one unit, so
        // fromStatus is the real previous status (FR-12).
        db.$transaction(async (tx): Promise<StatusChangeResult> => {
          const current = await tx.inquiry.findUnique({ where: { id }, select: { status: true } });
          if (!current) return { result: "not_found" };
          if (current.status === status) return { result: "unchanged" };
          await tx.inquiry.update({
            where: { id },
            data: {
              status,
              events: {
                create: {
                  type: "STATUS_CHANGED",
                  fromStatus: current.status,
                  toStatus: status,
                  actorId,
                },
              },
            },
          });
          return { result: "changed", from: current.status, to: status };
        }),
      ),

    updateNotes: (id: string, notes: string | null, actorId: string) =>
      guard(() =>
        db.$transaction(async (tx): Promise<NotesChangeResult> => {
          const current = await tx.inquiry.findUnique({
            where: { id },
            select: { internalNotes: true, updatedAt: true },
          });
          if (!current) return { result: "not_found" };
          if (current.internalNotes === notes) {
            return { result: "unchanged", updatedAt: current.updatedAt };
          }
          // The event records who and when; the notes themselves are only in the inquiry.
          const updated = await tx.inquiry.update({
            where: { id },
            data: { internalNotes: notes, events: { create: { type: "NOTES_UPDATED", actorId } } },
            select: { updatedAt: true },
          });
          return { result: "changed", updatedAt: updated.updatedAt };
        }),
      ),
  };
}
