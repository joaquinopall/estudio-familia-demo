/**
 * Retention rule (F5-05, SPEC §7, NFR-PRIV-01), used by `npm run inquiries:purge`.
 *
 * - A CLOSED or DISCARDED inquiry is deleted when it was closed more than RETENTION_MONTHS
 *   ago. Its closing date is the last status change into its current status (the history);
 *   without one, its last update. Closing an old inquiry today never deletes it tomorrow.
 * - Open inquiries (NEW, IN_REVIEW, CONTACTED) are never deleted: the ones created longer ago
 *   than that are only counted, so the firm reviews and closes them.
 * - Without `apply` it only counts (dry run).
 *
 * Pure: the storage comes as a parameter (retention-repository.ts implements it with Prisma).
 */
import type { InquiryStatus } from "./types";

export type ClosedInquiryRow = {
  id: string;
  status: "CLOSED" | "DISCARDED";
  updatedAt: Date;
  /** The latest STATUS_CHANGED event, if any. */
  lastStatusChange: { toStatus: InquiryStatus | null; createdAt: Date } | null;
};

export interface RetentionStore {
  /** Up to `take` CLOSED or DISCARDED inquiries with an id greater than `afterId`, by id. */
  closedPage(afterId: string | null, take: number): Promise<ClosedInquiryRow[]>;
  /** How many open inquiries were created before `cutoff`. */
  countOpenCreatedBefore(cutoff: Date): Promise<number>;
  /** Deletes these inquiries (their history goes with them) and returns how many. */
  deleteByIds(ids: readonly string[]): Promise<number>;
}

export type RetentionReport = {
  cutoff: Date;
  /** Closed or discarded more than the retention period ago. */
  expired: number;
  /** Deleted in this run (0 in a dry run). */
  deleted: number;
  /** Still open, created before the cutoff: to review, never deleted. */
  openStale: number;
};

/**
 * `date` minus `months`, in UTC, keeping the time. A day that does not exist in the target
 * month becomes its last day (31 March - 1 month = 28 or 29 February).
 */
export function subtractMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() - months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const result = new Date(date);
  result.setUTCDate(1);
  result.setUTCFullYear(year, month, Math.min(date.getUTCDate(), lastDay));
  return result;
}

/** When the inquiry was closed or discarded: its last change into the current status. */
export function closedAtOf(row: ClosedInquiryRow): Date {
  const change = row.lastStatusChange;
  return change && change.toStatus === row.status ? change.createdAt : row.updatedAt;
}

const PAGE_SIZE = 500;
const DELETE_BATCH = 100;

export async function runRetention(
  deps: { store: RetentionStore; now: Date; months: number },
  options: { apply: boolean },
): Promise<RetentionReport> {
  const cutoff = subtractMonths(deps.now, deps.months);

  const expiredIds: string[] = [];
  let afterId: string | null = null;
  for (;;) {
    const rows = await deps.store.closedPage(afterId, PAGE_SIZE);
    if (rows.length === 0) break;
    for (const row of rows) {
      if (closedAtOf(row) < cutoff) expiredIds.push(row.id);
    }
    afterId = rows.at(-1)?.id ?? null;
  }

  let deleted = 0;
  if (options.apply) {
    for (let start = 0; start < expiredIds.length; start += DELETE_BATCH) {
      deleted += await deps.store.deleteByIds(expiredIds.slice(start, start + DELETE_BATCH));
    }
  }

  return {
    cutoff,
    expired: expiredIds.length,
    deleted,
    openStale: await deps.store.countOpenCreatedBefore(cutoff),
  };
}

export const PURGE_USAGE = [
  "Uso: npm run inquiries:purge [-- --confirm]",
  "",
  "  sin --confirm   cuenta las consultas vencidas, sin borrar nada",
  "  --confirm       borra las cerradas o descartadas hace más de los meses de retención",
].join("\n");

/** Arguments of `npm run inquiries:purge`: only `--confirm`. */
export function parsePurgeArgs(
  argv: readonly string[],
): { status: "ok"; apply: boolean } | { status: "error"; message: string } {
  const unknown = argv.filter((arg) => arg !== "--confirm");
  if (unknown.length > 0) {
    return { status: "error", message: `Argumento desconocido: ${unknown.join(" ")}` };
  }
  return { status: "ok", apply: argv.includes("--confirm") };
}
