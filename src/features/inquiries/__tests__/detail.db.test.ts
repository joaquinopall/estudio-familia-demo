/**
 * Detail, status and notes against the DEVELOPMENT database (US-06 CA3, FR-11, FR-12).
 * Runs only with `npm run test:db`. Rows are marked with E2E- and deleted at the end.
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrismaInquiryRepository } from "@/features/inquiries/repository";
import { getDb } from "@/lib/db";

const RUN = randomUUID().slice(0, 8);
const MARKER = `E2E-${RUN}`;

describe("Prisma inquiry repository: detail and changes (Supabase dev)", () => {
  const db = getDb();
  const repository = createPrismaInquiryRepository(db);
  let inquiryId = "";
  let staffId = "";

  beforeAll(async () => {
    ({ id: inquiryId } = await repository.createWithCreatedEvent({
      area: "DIVORCE",
      urgency: "NORMAL",
      message: `${MARKER} prueba del detalle; se borra al terminar.`,
      fullName: `${MARKER} Detalle`,
      email: `e2e-${RUN}@example.com`,
      phone: null,
      preferredChannel: "EMAIL",
      safeToContact: null,
      emailIsPrivate: true,
      consentAt: new Date("2026-11-25T12:00:00Z"),
      privacyPolicyVersion: "1.1",
      ipHash: "ab".repeat(32),
      source: null,
    }));
    ({ id: staffId } = await db.staffMember.create({
      data: {
        authUserId: randomUUID(),
        email: `e2e-${RUN}-staff@example.com`,
        fullName: `${MARKER} Staff`,
      },
    }));
  });

  afterAll(async () => {
    await db.inquiry.deleteMany({ where: { fullName: { startsWith: MARKER } } });
    await db.staffMember.deleteMany({ where: { fullName: { startsWith: MARKER } } });
    expect(await db.inquiry.count({ where: { fullName: { startsWith: MARKER } } })).toBe(0);
    await db.$disconnect();
  });

  it("finds the inquiry with its CREATED event, and never the ipHash", async () => {
    const row = await repository.findById(inquiryId);

    expect(row).toMatchObject({ id: inquiryId, status: "NEW", internalNotes: null });
    expect(row).not.toHaveProperty("ipHash");
    expect(row?.events).toEqual([
      expect.objectContaining({ type: "CREATED", actorId: null, actorName: null }),
    ]);
  });

  it("returns null for an unknown id", async () => {
    expect(await repository.findById(randomUUID())).toBeNull();
  });

  it("changes the status with its event in one transaction, with the real fromStatus", async () => {
    expect(await repository.updateStatus(inquiryId, "IN_REVIEW", staffId)).toEqual({
      result: "changed",
      from: "NEW",
      to: "IN_REVIEW",
    });
    expect(await repository.updateStatus(inquiryId, "CLOSED", staffId)).toMatchObject({
      from: "IN_REVIEW",
    });

    const row = await repository.findById(inquiryId);
    expect(row?.status).toBe("CLOSED");
    expect(row?.events.slice(1)).toEqual([
      expect.objectContaining({
        type: "STATUS_CHANGED",
        fromStatus: "NEW",
        toStatus: "IN_REVIEW",
        actorId: staffId,
        actorName: `${MARKER} Staff`,
      }),
      expect.objectContaining({
        type: "STATUS_CHANGED",
        fromStatus: "IN_REVIEW",
        toStatus: "CLOSED",
      }),
    ]);
  });

  it("does not write anything for the same status", async () => {
    const before = (await repository.findById(inquiryId))?.events.length;

    expect(await repository.updateStatus(inquiryId, "CLOSED", staffId)).toEqual({
      result: "unchanged",
    });
    expect((await repository.findById(inquiryId))?.events.length).toBe(before);
  });

  it("saves the notes with an event that does not contain them", async () => {
    const result = await repository.updateNotes(inquiryId, `${MARKER} nota privada`, staffId);
    expect(result.result).toBe("changed");

    const row = await repository.findById(inquiryId);
    expect(row?.internalNotes).toBe(`${MARKER} nota privada`);
    expect(row?.events.at(-1)).toMatchObject({ type: "NOTES_UPDATED", actorId: staffId });
    expect(JSON.stringify(row?.events)).not.toContain("nota privada");

    expect(
      (await repository.updateNotes(inquiryId, `${MARKER} nota privada`, staffId)).result,
    ).toBe("unchanged");
  });

  it("reports not_found for both changes on an unknown id", async () => {
    expect(await repository.updateStatus(randomUUID(), "CLOSED", staffId)).toEqual({
      result: "not_found",
    });
    expect(await repository.updateNotes(randomUUID(), "x", staffId)).toEqual({
      result: "not_found",
    });
  });

  it("keeps the history when the actor no longer exists (no foreign key)", async () => {
    await db.staffMember.delete({ where: { id: staffId } });

    const row = await repository.findById(inquiryId);

    expect(
      row?.events.slice(1).every((event) => event.actorId === staffId && event.actorName === null),
    ).toBe(true);
  });
});
