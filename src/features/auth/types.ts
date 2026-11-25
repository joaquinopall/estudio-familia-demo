/**
 * Domain types of staff access (SPEC §7, §16). They do not depend on Prisma; the repository
 * maps its rows into them.
 */

/** v1 has a single role (SPEC §2: other roles are out of scope). */
export type StaffRole = "ADMIN";

export type StaffMember = {
  id: string;
  /** auth.users.id in Supabase. */
  authUserId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  active: boolean;
};

/** A Supabase Auth user, as far as staff:add needs it. */
export type AuthUser = { id: string; email: string };
