import { describe, expect, it } from "vitest";

import { RETENTION_MONTHS } from "@/config/retention";
import { privacyPolicy } from "@/content/legal/privacy";
import {
  type ClosedInquiryRow,
  type RetentionStore,
  closedAtOf,
  parsePurgeArgs,
  runRetention,
  subtractMonths,
} from "@/features/inquiries/retention";

const NOW = new Date("2026-11-27T12:00:00.000Z");
const at = (iso: string) => new Date(iso);

/** In-memory store: closed rows by id, open ones by creation date, and what was deleted. */
class MemoryRetentionStore implements RetentionStore {
  readonly deleted: string[] = [];
  constructor(
    private closed: ClosedInquiryRow[],
    private openCreatedAt: Date[] = [],
  ) {}

  async closedPage(afterId: string | null, take: number) {
    return this.closed
      .filter((row) => afterId === null || row.id > afterId)
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, take);
  }

  async countOpenCreatedBefore(cutoff: Date) {
    return this.openCreatedAt.filter((date) => date < cutoff).length;
  }

  async deleteByIds(ids: readonly string[]) {
    this.deleted.push(...ids);
    this.closed = this.closed.filter((row) => !ids.includes(row.id));
    return ids.length;
  }
}

const closedRow = (
  id: string,
  closedAt: string,
  overrides: Partial<ClosedInquiryRow> = {},
): ClosedInquiryRow => ({
  id,
  status: "CLOSED",
  updatedAt: at(closedAt),
  lastStatusChange: { toStatus: "CLOSED", createdAt: at(closedAt) },
  ...overrides,
});

describe("retention period (config/retention.ts)", () => {
  it("is the 24 months the privacy policy promises", () => {
    expect(RETENTION_MONTHS).toBe(24);
  });

  it("matches the privacy policy, counted from closing (policy 1.2)", () => {
    const section = privacyPolicy.sections.find((item) => item.id === "conservacion");
    const text = section?.paragraphs?.join(" ") ?? "";

    expect(text).toContain(`la eliminamos a los ${RETENTION_MONTHS} meses de ese momento`);
    expect(text).toMatch(/cerramos o la descartamos/);
  });
});

describe("subtractMonths", () => {
  it("keeps the day and the time", () => {
    expect(subtractMonths(NOW, 24)).toEqual(at("2024-11-27T12:00:00.000Z"));
  });

  it("moves to the last day when the day does not exist in the target month", () => {
    expect(subtractMonths(at("2026-03-31T08:00:00Z"), 1)).toEqual(at("2026-02-28T08:00:00Z"));
    expect(subtractMonths(at("2028-03-31T08:00:00Z"), 1)).toEqual(at("2028-02-29T08:00:00Z"));
  });

  it("handles a leap day and the change of year", () => {
    expect(subtractMonths(at("2028-02-29T00:00:00Z"), 24)).toEqual(at("2026-02-28T00:00:00Z"));
    expect(subtractMonths(at("2026-01-15T00:00:00Z"), 2)).toEqual(at("2025-11-15T00:00:00Z"));
  });
});

describe("closedAtOf", () => {
  it("is the last status change into the current status", () => {
    const row = closedRow("a", "2024-01-10T00:00:00Z", { updatedAt: at("2026-11-01T00:00:00Z") });
    expect(closedAtOf(row)).toEqual(at("2024-01-10T00:00:00Z"));
  });

  it("falls back to the last update without that event", () => {
    const updatedAt = at("2023-05-05T00:00:00Z");
    expect(closedAtOf(closedRow("a", "2023-05-05T00:00:00Z", { lastStatusChange: null }))).toEqual(
      updatedAt,
    );
    expect(
      closedAtOf(
        closedRow("a", "2023-05-05T00:00:00Z", {
          status: "DISCARDED",
          lastStatusChange: { toStatus: "CLOSED", createdAt: at("2020-01-01T00:00:00Z") },
        }),
      ),
    ).toEqual(updatedAt);
  });
});

describe("runRetention (F5-05, NFR-PRIV-01)", () => {
  const rows = () => [
    closedRow("a", "2024-11-01T00:00:00Z"), // closed 25 months ago: expired
    closedRow("b", "2024-11-27T12:00:01Z"), // a second short of 24 months: kept
    closedRow("c", "2026-11-26T00:00:00Z", {
      status: "DISCARDED",
      lastStatusChange: { toStatus: "DISCARDED", createdAt: at("2026-11-26T00:00:00Z") },
    }), // old inquiry, closed yesterday: kept
    closedRow("d", "2022-02-02T00:00:00Z", {
      status: "DISCARDED",
      lastStatusChange: { toStatus: "DISCARDED", createdAt: at("2022-02-02T00:00:00Z") },
    }), // expired
  ];
  const deps = (store: RetentionStore) => ({ store, now: NOW, months: RETENTION_MONTHS });

  it("only counts without apply (dry run)", async () => {
    const store = new MemoryRetentionStore(rows());

    const report = await runRetention(deps(store), { apply: false });

    expect(report).toEqual({
      cutoff: at("2024-11-27T12:00:00.000Z"),
      expired: 2,
      deleted: 0,
      openStale: 0,
    });
    expect(store.deleted).toEqual([]);
  });

  it("deletes exactly the ones closed more than 24 months ago", async () => {
    const store = new MemoryRetentionStore(rows());

    const report = await runRetention(deps(store), { apply: true });

    expect(report.deleted).toBe(2);
    expect(store.deleted.sort()).toEqual(["a", "d"]);
  });

  it("never deletes an old inquiry that was closed recently", async () => {
    const store = new MemoryRetentionStore([
      closedRow("old", "2026-11-20T00:00:00Z", { updatedAt: at("2026-11-20T00:00:00Z") }),
    ]);

    expect((await runRetention(deps(store), { apply: true })).deleted).toBe(0);
  });

  it("counts old open inquiries without deleting them", async () => {
    const store = new MemoryRetentionStore(
      [],
      [at("2020-01-01T00:00:00Z"), at("2024-11-27T11:59:59Z"), at("2026-01-01T00:00:00Z")],
    );

    const report = await runRetention(deps(store), { apply: true });

    expect(report.openStale).toBe(2);
    expect(store.deleted).toEqual([]);
  });

  it("walks every page and deletes in batches, so it scales past one page", async () => {
    const many = Array.from({ length: 1205 }, (_, i) =>
      closedRow(`id-${String(i).padStart(5, "0")}`, "2020-01-01T00:00:00Z"),
    );
    const store = new MemoryRetentionStore(many);

    const report = await runRetention(deps(store), { apply: true });

    expect(report).toMatchObject({ expired: 1205, deleted: 1205 });
    expect(new Set(store.deleted).size).toBe(1205);
  });

  it("a second run finds nothing left", async () => {
    const store = new MemoryRetentionStore(rows());
    await runRetention(deps(store), { apply: true });

    expect((await runRetention(deps(store), { apply: true })).expired).toBe(0);
  });
});

describe("parsePurgeArgs", () => {
  it("is a dry run by default", () => {
    expect(parsePurgeArgs([])).toEqual({ status: "ok", apply: false });
  });

  it("deletes only with --confirm", () => {
    expect(parsePurgeArgs(["--confirm"])).toEqual({ status: "ok", apply: true });
  });

  it("rejects anything else, so a typo never deletes", () => {
    expect(parsePurgeArgs(["--confrim"])).toMatchObject({ status: "error" });
    expect(parsePurgeArgs(["--confirm", "--all"])).toMatchObject({ status: "error" });
  });
});
