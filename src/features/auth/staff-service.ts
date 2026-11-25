/**
 * Staff registration (SPEC §7, ADR-0015). Declares the StaffRepository it needs; repository.ts
 * implements it with Prisma. Pure and tested with a fake repository.
 */
import type { StaffMemberInput } from "./schema";
import type { AuthUser, StaffMember } from "./types";

export type NewStaffRecord = { authUserId: string; email: string; fullName: string };

export interface StaffRepository {
  findByAuthUserId(authUserId: string): Promise<StaffMember | null>;
  findByEmail(email: string): Promise<StaffMember | null>;
  /** The Supabase Auth user with this email (lowercase), or null. Deleted users do not count. */
  findAuthUserByEmail(email: string): Promise<AuthUser | null>;
  /** Whether a (not deleted) Supabase Auth user with this id exists. */
  authUserExists(authUserId: string): Promise<boolean>;
  create(record: NewStaffRecord): Promise<StaffMember>;
  /** Sets the Auth user, email and name, and turns the member active again. */
  reactivate(id: string, changes: NewStaffRecord): Promise<StaffMember>;
}

export type AddStaffResult =
  | { status: "created"; member: StaffMember }
  | { status: "updated"; member: StaffMember }
  /**
   * The Auth user was deleted and created again (new id, same email): the existing member is
   * linked to the new user. Its id stays, so its history (InquiryEvent.actorId) is kept.
   */
  | { status: "relinked"; member: StaffMember }
  /** The user must be created first in Supabase → Authentication → Users. */
  | { status: "auth_user_not_found" }
  /**
   * Another member already has this email and its Auth user still exists (it changed its
   * email in Auth after staff:add). Nothing is changed: a person has to look at it.
   */
  | { status: "email_in_use" };

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
  const record: NewStaffRecord = {
    authUserId: authUser.id,
    email: authUser.email.toLowerCase(),
    fullName: input.fullName,
  };

  const existing = await repository.findByAuthUserId(authUser.id);
  if (existing) {
    return { status: "updated", member: await repository.reactivate(existing.id, record) };
  }

  // staff_members has no foreign key to auth.users (SPEC §7), so deleting a user in Auth
  // leaves its member behind, with the same (unique) email.
  const sameEmail = await repository.findByEmail(record.email);
  if (sameEmail) {
    if (await repository.authUserExists(sameEmail.authUserId)) return { status: "email_in_use" };
    return { status: "relinked", member: await repository.reactivate(sameEmail.id, record) };
  }

  return { status: "created", member: await repository.create(record) };
}
