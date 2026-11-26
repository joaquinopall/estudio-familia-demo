/**
 * The panel list against the DEVELOPMENT database (US-06 CA2, NFR-ESC-01). Runs only with
 * `npm run test:db`. Every query searches this run's marker, so other rows in dev never count.
 * Rows are marked with E2E- and deleted at the end.
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrismaInquiryRepository } from "@/features/inquiries/repository";
import type { InquiryListQuery } from "@/features/inquiries/service";
import { getDb } from "@/lib/db";

import { createTestFieldCipher } from "./test-field-cipher";

const RUN = randomUUID().slice(0, 8);
const MARKER = `E2E-${RUN}`;
const cipher = createTestFieldCipher();

/** Five rows, one minute apart; name "<MARKER> n", email "e2e-<run>-n@example.com". */
const SEED = [
  { status: "NEW", area: "SUCCESSION", urgency: "HIGH" },
  { status: "IN_REVIEW", area: "DIVORCE", urgency: "LOW" },
  { status: "NEW", area: "DIVORCE", urgency: "HIGH" },
  { status: "CLOSED", area: "SUCCESSION", urgency: "NORMAL" },
  { status: "NEW", area: "CHILD_SUPPORT", urgency: "NORMAL" },
] as const;

describe("Prisma inquiry repository: list (Supabase dev)", () => {
  const db = getDb();
  const repository = createPrismaInquiryRepository(db, cipher);
  const list = (query: Partial<InquiryListQuery> = {}) =>
    repository.list({ search: MARKER, skip: 0, take: 20, ...query });

  beforeAll(async () => {
    await db.inquiry.createMany({
      data: SEED.map((fields, index) => ({
        ...fields,
        createdAt: new Date(Date.UTC(2026, 10, 25, 12, index)),
        fullName: `${MARKER} ${index}`,
        email: `e2e-${RUN}-${index}@example.com`,
        // The list never reads the message, so it is seeded without encrypting it.
        message: `${MARKER} prueba del listado; se borra al terminar.`,
        preferredChannel: "EMAIL",
        safeToContact: null,
        emailIsPrivate: index % 2 === 0,
        consentAt: new Date("2026-11-25T12:00:00Z"),
        privacyPolicyVersion: "1.1",
      })),
    });
  });

  afterAll(async () => {
    await db.inquiry.deleteMany({ where: { fullName: { startsWith: MARKER } } });
    expect(await db.inquiry.count({ where: { fullName: { startsWith: MARKER } } })).toBe(0);
    await db.$disconnect();
  });

  it("lists newest first with the total", async () => {
    const { rows, total } = await list();

    expect(total).toBe(5);
    expect(rows.map((row) => row.fullName)).toEqual([4, 3, 2, 1, 0].map((n) => `${MARKER} ${n}`));
  });

  it("returns only the list fields: never the message, the phone or the notes", async () => {
    const [row] = (await list({ take: 1 })).rows;

    expect(Object.keys(row ?? {}).sort()).toEqual(
      [
        "area",
        "createdAt",
        "email",
        "emailIsPrivate",
        "fullName",
        "id",
        "preferredChannel",
        "safeToContact",
        "status",
        "urgency",
      ].sort(),
    );
  });

  it.each([
    [{ status: "NEW" }, [4, 2, 0]],
    [{ area: "DIVORCE" }, [2, 1]],
    [{ urgency: "HIGH" }, [2, 0]],
    [{ status: "NEW", area: "DIVORCE", urgency: "HIGH" }, [2]],
    [{ status: "DISCARDED" }, []],
  ] as const)("filters by %j", async (filters, expected) => {
    const { rows, total } = await list(filters);

    expect(total).toBe(expected.length);
    expect(rows.map((row) => row.fullName)).toEqual(expected.map((n) => `${MARKER} ${n}`));
  });

  it("searches the name without caring about case", async () => {
    const { total } = await list({ search: MARKER.toLowerCase() });

    expect(total).toBe(5);
  });

  it("searches the email, also in uppercase", async () => {
    const { rows } = await list({ search: `E2E-${RUN}-3@EXAMPLE` });

    expect(rows.map((row) => row.fullName)).toEqual([`${MARKER} 3`]);
  });

  it("treats % and _ in the search as text, not as wildcards", async () => {
    expect((await list({ search: `${MARKER}%` })).total).toBe(0);
  });

  it("paginates on the server: the total stays, the window moves", async () => {
    const first = await list({ take: 2 });
    const third = await list({ skip: 4, take: 2 });

    expect(first.total).toBe(5);
    expect(first.rows.map((row) => row.fullName)).toEqual([`${MARKER} 4`, `${MARKER} 3`]);
    expect(third.rows.map((row) => row.fullName)).toEqual([`${MARKER} 0`]);
  });
});
