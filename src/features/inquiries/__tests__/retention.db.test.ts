/**
 * The retention repository against the DEVELOPMENT database (F5-05). Runs only with
 * `npm run test:db`. It never runs the whole purge: that would reach the developer's own dev
 * inquiries. It reads through the real repository and deletes only this run's E2E- rows.
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { RETENTION_MONTHS } from "@/config/retention";
import { type ClosedInquiryRow, closedAtOf, subtractMonths } from "@/features/inquiries/retention";
import { createPrismaRetentionStore } from "@/features/inquiries/retention-repository";
import { getDb } from "@/lib/db";

const RUN = randomUUID().slice(0, 8);
const MARKER = `E2E-${RUN}`;
const MONTH = 30 * 24 * 60 * 60 * 1000;

describe("Prisma retention store (Supabase dev)", () => {
  const db = getDb();
  const store = createPrismaRetentionStore(db);
  const now = new Date();
  const cutoff = subtractMonths(now, RETENTION_MONTHS);
  const ids = { expired: randomUUID(), recentlyClosed: randomUUID(), noEvent: randomUUID() };

  /** An inquiry with its CREATED event and, optionally, a status change at `closedAt`. */
  async function seed(
    id: string,
    name: string,
    status: "CLOSED" | "DISCARDED" | "NEW",
    dates: { createdAt: Date; closedAt?: Date },
  ) {
    await db.inquiry.create({
      data: {
        id,
        createdAt: dates.createdAt,
        updatedAt: dates.closedAt ?? dates.createdAt,
        fullName: `${MARKER} ${name}`,
        email: `e2e-${RUN}-${name.toLowerCase()}@example.com`,
        area: "SUCCESSION",
        urgency: "LOW",
        message: "E2E retención: nunca se lee.",
        preferredChannel: "EMAIL",
        emailIsPrivate: true,
        consentAt: dates.createdAt,
        privacyPolicyVersion: "1.2",
        status,
        events: {
          create: [
            { type: "CREATED", createdAt: dates.createdAt },
            ...(dates.closedAt
              ? [
                  {
                    type: "STATUS_CHANGED" as const,
                    fromStatus: "NEW" as const,
                    toStatus: status,
                    createdAt: dates.closedAt,
                  },
                ]
              : []),
          ],
        },
      },
    });
  }

  /** Every closed row of the database, then only this run's. */
  async function ownClosedRows(): Promise<ClosedInquiryRow[]> {
    const own = new Set<string>(Object.values(ids));
    const rows: ClosedInquiryRow[] = [];
    let afterId: string | null = null;
    for (;;) {
      const page = await store.closedPage(afterId, 200);
      if (page.length === 0) break;
      rows.push(...page.filter((row) => own.has(row.id)));
      afterId = page.at(-1)?.id ?? null;
    }
    return rows;
  }

  beforeAll(async () => {
    const old = new Date(now.getTime() - 30 * MONTH);
    await seed(ids.expired, "Vencida", "CLOSED", {
      createdAt: old,
      closedAt: new Date(now.getTime() - 25 * MONTH),
    });
    await seed(ids.recentlyClosed, "Reciente", "DISCARDED", {
      createdAt: old,
      closedAt: new Date(now.getTime() - MONTH),
    });
    // Closed without a status change event: its last update counts.
    await seed(ids.noEvent, "SinEvento", "CLOSED", { createdAt: old });
  });

  afterAll(async () => {
    await db.inquiry.deleteMany({ where: { fullName: { startsWith: MARKER } } });
    expect(await db.inquiry.count({ where: { fullName: { startsWith: MARKER } } })).toBe(0);
    await db.$disconnect();
  });

  it("reads the closing date from the history, or the last update without it", async () => {
    const rows = new Map((await ownClosedRows()).map((row) => [row.id, row]));

    expect(rows.size).toBe(3);
    expect(rows.get(ids.expired)?.lastStatusChange?.toStatus).toBe("CLOSED");
    expect(rows.get(ids.noEvent)?.lastStatusChange).toBeNull();
    const expired = [...rows.values()]
      .filter((row) => closedAtOf(row) < cutoff)
      .map((row) => row.id);
    expect(expired.sort()).toEqual([ids.expired, ids.noEvent].sort());
  });

  it("counts old open inquiries", async () => {
    const before = await store.countOpenCreatedBefore(cutoff);
    const openId = randomUUID();
    await seed(openId, "Abierta", "NEW", { createdAt: new Date(now.getTime() - 30 * MONTH) });

    expect(await store.countOpenCreatedBefore(cutoff)).toBe(before + 1);
    await store.deleteByIds([openId]);
  });

  it("deletes the given inquiries with their history, and nothing else", async () => {
    expect(await store.deleteByIds([ids.expired])).toBe(1);

    expect(await db.inquiry.findUnique({ where: { id: ids.expired } })).toBeNull();
    expect(await db.inquiryEvent.count({ where: { inquiryId: ids.expired } })).toBe(0);
    expect(
      await db.inquiry.count({ where: { id: { in: [ids.recentlyClosed, ids.noEvent] } } }),
    ).toBe(2);
    expect(await store.deleteByIds([])).toBe(0);
  });
});
