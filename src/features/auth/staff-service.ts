/**
 * Staff registration (SPEC §7, ADR-0015). Declares the StaffRepository it needs; repository.ts
 * implements it with Prisma. Pure and tested with a fake repository.
 */
import type { StaffMemberInput } from "./schema";
import type { AuthUser, StaffMember } from "./types";

export type NewStaffRecord = { authUserId: string; email: string; fullName: string };

export interface StaffRepository {
  findByAuthUserId(authUserId: string): Promise<StaffMember | null>;
  /** The Supabase Auth user with this email (lowercase), or null. Deleted users do not count. */
  findAuthUserByEmail(email: string): Promise<AuthUser | null>;
  create(record: NewStaffRecord): Promise<StaffMember>;
  /** Updates the name and email and turns the member active again. */
  reactivate(id: string, changes: { email: string; fullName: string }): Promise<StaffMember>;
}

export type AddStaffResult =
  | { status: "created"; member: StaffMember }
  | { status: "updated"; member: StaffMember }
  /** The user must be created first in Supabase → Authentication → Users. */
  | { status: "auth_user_not_found" };

/**
 * Links an existing Supabase Auth user as active staff. Idempotent: running it again for the
 * same user updates the name and reactivates it, never duplicates it.
 */
export async function addStaffMember(
  input: StaffMemberInput,
  repository: StaffRepository,
): Promise<AddStaffResult> {
  const authUser = await repository.findAuthUserByEmail(input.email);
  if (!authUser) return { status: "auth_user_not_found" };

  // The email of the Auth user is the source of truth (it is what the login checks).
  const changes = { email: authUser.email.toLowerCase(), fullName: input.fullName };
  const existing = await repository.findByAuthUserId(authUser.id);
  if (existing) {
    return { status: "updated", member: await repository.reactivate(existing.id, changes) };
  }
  return {
    status: "created",
    member: await repository.create({ authUserId: authUser.id, ...changes }),
  };
}
