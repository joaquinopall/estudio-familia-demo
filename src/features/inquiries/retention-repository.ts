/**
 * Storage of the retention rule (F5-05, retention.ts) with Prisma. Kept apart from
 * repository.ts, which serves the form and the panel: this one only runs from
 * `npm run inquiries:purge`. It reads no personal field: ids, status and dates only.
 */
import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

import type { ClosedInquiryRow, RetentionStore } from "./retention";

const CLOSED_STATUSES = ["CLOSED", "DISCARDED"] as const;
const OPEN_STATUSES = ["NEW", "IN_REVIEW", "CONTACTED"] as const;

export function createPrismaRetentionStore(db: PrismaClient): RetentionStore {
  return {
    async closedPage(afterId, take) {
      const rows = await db.inquiry.findMany({
        where: {
          status: { in: [...CLOSED_STATUSES] },
          ...(afterId ? { id: { gt: afterId } } : {}),
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          events: {
            where: { type: "STATUS_CHANGED" },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 1,
            select: { toStatus: true, createdAt: true },
          },
        },
        orderBy: { id: "asc" },
        take,
      });
      return rows.map((row): ClosedInquiryRow => ({
        id: row.id,
        status: row.status as ClosedInquiryRow["status"],
        updatedAt: row.updatedAt,
        lastStatusChange: row.events[0] ?? null,
      }));
    },

    countOpenCreatedBefore: (cutoff) =>
      db.inquiry.count({
        where: { status: { in: [...OPEN_STATUSES] }, createdAt: { lt: cutoff } },
      }),

    async deleteByIds(ids) {
      if (ids.length === 0) return 0;
      // Events go with their inquiry (onDelete: Cascade, SPEC §7).
      const { count } = await db.inquiry.deleteMany({ where: { id: { in: [...ids] } } });
      return count;
    },
  };
}
