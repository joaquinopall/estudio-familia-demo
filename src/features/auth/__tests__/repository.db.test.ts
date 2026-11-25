/**
 * Integration test of the staff repository against the DEVELOPMENT database.
 * Runs only with `npm run test:db`. Rows are marked with E2E- and deleted at the end.
 *
 * It also proves that the Prisma connection can read auth.users (ADR-0015): staff:add depends
 * on it.
 */
import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { StaffStoreError } from "@/features/auth/errors";
import { createPrismaStaffRepository } from "@/features/auth/repository";
import { getDb } from "@/lib/db";

const RUN = randomUUID().slice(0, 8);
const MARKER = `E2E-${RUN}`;

/** A fresh, unlinked StaffMember: there is no foreign key to auth.users (SPEC §7). */
const record = () => ({
  authUserId: randomUUID(),
  email: `${MARKER.toLowerCase()}-${randomUUID().slice(0, 4)}@example.com`,
  fullName: `${MARKER} Staff`,
});

describe("Prisma staff repository (Supabase dev)", () => {
  const db = getDb();
  const repository = createPrismaStaffRepository(db);

  afterAll(async () => {
    await db.staffMember.deleteMany({ where: { fullName: { startsWith: MARKER } } });
    const left = await db.staffMember.count({ where: { fullName: { startsWith: MARKER } } });
    expect(left).toBe(0);
    await db.$disconnect();
  });

  it("creates an active ADMIN and finds it by its Auth user id", async () => {
    const input = record();

    const created = await repository.create(input);
    const found = await repository.findByAuthUserId(input.authUserId);

    expect(created).toMatchObject({ ...input, role: "ADMIN", active: true });
    expect(found).toEqual(created);
  });

  it("returns null for an Auth user id without staff", async () => {
    expect(await repository.findByAuthUserId(randomUUID())).toBeNull();
  });

  it("reactivates a member and updates its name", async () => {
    const created = await repository.create(record());
    await db.staffMember.update({ where: { id: created.id }, data: { active: false } });

    const updated = await repository.reactivate(created.id, {
      email: created.email,
      fullName: `${MARKER} Nombre nuevo`,
    });

    expect(updated).toMatchObject({
      id: created.id,
      active: true,
      fullName: `${MARKER} Nombre nuevo`,
    });
  });

  it("can read auth.users: an unknown email returns null instead of a permission error", async () => {
    expect(await repository.findAuthUserByEmail(`${MARKER.toLowerCase()}@example.com`)).toBeNull();
  });

  it("finds an existing Auth user by email, ignoring case", async () => {
    const [someone] = await db.$queryRaw<{ email: string }[]>`
      select email::text as email from auth.users where email is not null and deleted_at is null limit 1`;
    // A dev project with no Auth users yet has nothing to find; the previous test still proves
    // the permission.
    if (!someone) return;

    const found = await repository.findAuthUserByEmail(someone.email.toUpperCase());

    // Compared as a boolean so a failure never prints a real email.
    expect(found?.email.toLowerCase() === someone.email.toLowerCase()).toBe(true);
    expect(found?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("wraps database errors in StaffStoreError, without the duplicated value", async () => {
    const input = record();
    await repository.create(input);

    const error: unknown = await repository
      .create({ ...input, email: `${input.email}.dup` })
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(StaffStoreError);
    expect((error as Error).message).not.toContain(input.authUserId);
  });
});
