/**
 * Integration test of the Prisma repository against the DEVELOPMENT database.
 * Runs only with `npm run test:db`. Rows are marked with E2E- and deleted at the end.
 */
import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { InquiryStoreError } from "@/features/inquiries/errors";
import { createPrismaInquiryRepository } from "@/features/inquiries/repository";
import type { NewInquiryRecord } from "@/features/inquiries/service";
import { getDb } from "@/lib/db";

const RUN = randomUUID().slice(0, 8);
const MARKER = `E2E-${RUN}`;

const record = (overrides: Partial<NewInquiryRecord> = {}): NewInquiryRecord => ({
  area: "SUCCESSION",
  urgency: "HIGH",
  message: `${MARKER} prueba del repository; se borra al terminar.`,
  fullName: `${MARKER} Repositorio`,
  email: `${MARKER.toLowerCase()}@example.com`,
  phone: "+54 9 11 5555-1234",
  preferredChannel: "WHATSAPP",
  safeToContact: false,
  emailIsPrivate: true,
  consentAt: new Date("2026-11-24T15:30:00.000Z"),
  privacyPolicyVersion: "1.1",
  ipHash: "ab".repeat(32),
  source: "test-db",
  ...overrides,
});

describe("Prisma inquiry repository (Supabase dev)", () => {
  const db = getDb();
  const repository = createPrismaInquiryRepository(db);

  afterAll(async () => {
    // Events go with their inquiry (onDelete: Cascade).
    await db.inquiry.deleteMany({ where: { fullName: { startsWith: MARKER } } });
    const left = await db.inquiry.count({ where: { fullName: { startsWith: MARKER } } });
    expect(left).toBe(0);
    await db.$disconnect();
  });

  it("stores the inquiry with its CREATED event and every field (FR-07)", async () => {
    const { id } = await repository.createWithCreatedEvent(record());

    const stored = await db.inquiry.findUniqueOrThrow({ where: { id }, include: { events: true } });

    expect(stored).toMatchObject({
      area: "SUCCESSION",
      urgency: "HIGH",
      fullName: `${MARKER} Repositorio`,
      phone: "+54 9 11 5555-1234",
      preferredChannel: "WHATSAPP",
      safeToContact: false,
      emailIsPrivate: true,
      consentAt: new Date("2026-11-24T15:30:00.000Z"),
      privacyPolicyVersion: "1.1",
      ipHash: "ab".repeat(32),
      source: "test-db",
      status: "NEW",
      internalNotes: null,
    });
    expect(stored.events).toHaveLength(1);
    expect(stored.events[0]).toMatchObject({
      type: "CREATED",
      actorId: null,
      fromStatus: null,
      toStatus: null,
    });
  });

  it("keeps the nulls of an email-only inquiry", async () => {
    const { id } = await repository.createWithCreatedEvent(
      record({ phone: null, preferredChannel: "EMAIL", safeToContact: null, ipHash: null }),
    );

    expect(await db.inquiry.findUniqueOrThrow({ where: { id } })).toMatchObject({
      phone: null,
      safeToContact: null,
      ipHash: null,
    });
  });

  it("throws InquiryStoreError and stores nothing when the database rejects the row", async () => {
    // fullName is VarChar(120): the database rejects it, as it would any failed write.
    const tooLong = `${MARKER} ${"x".repeat(200)}`;

    const rejection = await repository
      .createWithCreatedEvent(record({ fullName: tooLong }))
      .catch((error: unknown) => error);

    expect(rejection).toBeInstanceOf(InquiryStoreError);
    expect(await db.inquiry.count({ where: { fullName: tooLong } })).toBe(0);
  });
});
