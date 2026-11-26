/**
 * Integration test of the Prisma repository against the DEVELOPMENT database.
 * Runs only with `npm run test:db`. Rows are marked with E2E- and deleted at the end.
 */
import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { InquiryStoreError } from "@/features/inquiries/errors";
import {
  createPrismaInquiryRepository,
  createPrismaReencryptionStore,
} from "@/features/inquiries/repository";
import type { NewInquiryRecord } from "@/features/inquiries/service";
import { getDb } from "@/lib/db";

import { createTestFieldCipher } from "./test-field-cipher";

const RUN = randomUUID().slice(0, 8);
const MARKER = `E2E-${RUN}`;
const cipher = createTestFieldCipher();

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
  const repository = createPrismaInquiryRepository(db, cipher);

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
    // Stored encrypted, bound to this row (ADR-0017).
    expect(stored.message).toMatch(/^enc:v1:test:/);
    expect(stored.message).not.toContain("prueba del repository");
    expect(
      cipher.decrypt(stored.message, { table: "inquiries", column: "message", rowId: id }),
    ).toBe(`${MARKER} prueba del repository; se borra al terminar.`);
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

  it("reads the message back as text in the detail", async () => {
    const { id } = await repository.createWithCreatedEvent(record());

    expect((await repository.findById(id))?.message).toBe(
      `${MARKER} prueba del repository; se borra al terminar.`,
    );
  });

  it.each([
    ["plain text (a row that was never encrypted)", () => `${MARKER} en claro`],
    [
      "a value of another row",
      () => cipher.encrypt("x", { table: "inquiries", column: "message", rowId: randomUUID() }),
    ],
    [
      "a value from another key",
      () =>
        createTestFieldCipher("otra").encrypt("x", {
          table: "inquiries",
          column: "message",
          rowId: randomUUID(),
        }),
    ],
  ])("fails with decrypt_failed, never showing the stored value, for %s", async (_name, stored) => {
    const { id } = await repository.createWithCreatedEvent(record());
    await db.inquiry.update({ where: { id }, data: { message: stored() } });

    const error = await repository.findById(id).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InquiryStoreError);
    expect((error as InquiryStoreError).code).toBe("decrypt_failed");
    expect(String(error)).not.toContain("en claro");
  });

  // Only this test's row: running the whole re-encryption here would encrypt the developer's
  // dev rows with a throwaway key (that is `npm run inquiries:encrypt`, with the real one).
  it("re-encryption store: writes one row's fields and keeps its updatedAt", async () => {
    const { id } = await repository.createWithCreatedEvent(record());
    await db.inquiry.update({ where: { id }, data: { message: `${MARKER} en claro` } });
    const before = await db.inquiry.findUniqueOrThrow({ where: { id } });
    const store = createPrismaReencryptionStore(db);

    await store.update({
      id,
      updatedAt: before.updatedAt,
      message: cipher.encrypt(`${MARKER} en claro`, {
        table: "inquiries",
        column: "message",
        rowId: id,
      }),
    });

    const after = await db.inquiry.findUniqueOrThrow({ where: { id } });
    expect(after.updatedAt).toEqual(before.updatedAt);
    expect(after.message).toMatch(/^enc:v1:test:/);
    expect((await repository.findById(id))?.message).toBe(`${MARKER} en claro`);
  });

  it("re-encryption store: pages by id with the raw fields", async () => {
    const [first] = await createPrismaReencryptionStore(db).page(null, 1);

    expect(first).toEqual({
      id: expect.any(String),
      message: expect.any(String),
      internalNotes: first?.internalNotes ?? null,
      updatedAt: expect.any(Date),
    });
  });
});
