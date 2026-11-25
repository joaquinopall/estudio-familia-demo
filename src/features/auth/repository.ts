/**
 * Staff storage with Prisma (CLAUDE.md §3: the only place that touches Prisma for staff).
 * Implements the StaffRepository that staff-service.ts declares.
 *
 * auth.users (Supabase Auth) is read with a parameterized $queryRaw: the Prisma connection is
 * the database owner, which can read it, and no service role key is needed (SPEC §9,
 * ADR-0015). It is never written from here.
 *
 * Errors: any Prisma failure becomes StaffStoreError, so no Prisma message (which may contain
 * values) reaches a log.
 */
import "server-only";

import type { PrismaClient, StaffMember as StaffRow } from "@/generated/prisma/client";

import { StaffStoreError } from "./errors";
import type { NewStaffRecord, StaffRepository } from "./staff-service";
import type { AuthUser, StaffMember } from "./types";

const toDomain = (row: StaffRow): StaffMember => ({
  id: row.id,
  authUserId: row.authUserId,
  email: row.email,
  fullName: row.fullName,
  role: row.role,
  active: row.active,
});

async function guard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw new StaffStoreError({ cause: error });
  }
}

export function createPrismaStaffRepository(db: PrismaClient): StaffRepository {
  return {
    findByAuthUserId: (authUserId) =>
      guard(async () => {
        const row = await db.staffMember.findUnique({ where: { authUserId } });
        return row ? toDomain(row) : null;
      }),

    findAuthUserByEmail: (email) =>
      guard(async () => {
        // Tagged template: Prisma sends the email as a parameter, never as SQL text.
        const rows = await db.$queryRaw<AuthUser[]>`
          select id::text as id, email::text as email
          from auth.users
          where lower(email) = lower(${email}) and deleted_at is null
          limit 1`;
        return rows[0] ?? null;
      }),

    create: (record: NewStaffRecord) =>
      guard(async () => toDomain(await db.staffMember.create({ data: record }))),

    reactivate: (id, changes) =>
      guard(async () =>
        toDomain(
          await db.staffMember.update({ where: { id }, data: { ...changes, active: true } }),
        ),
      ),
  };
}
