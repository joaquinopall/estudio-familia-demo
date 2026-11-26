/**
 * Data Access Layer of the admin panel (SPEC §6.4 step 2, NFR-SEC-02, ADR-0015).
 *
 * Every admin page calls requireStaff() and every admin action calls requireStaffForAction().
 * The proxy is only a first, optimistic barrier. The check runs once per request: React's
 * cache() shares it between the layout, the page and their components.
 */
import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import type { ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createSupabaseAuthGateway } from "@/lib/supabase/auth-gateway";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  type StaffAccess,
  accessRedirectTarget,
  accessToActionResult,
  checkStaffAccess,
} from "./access";
import { createPrismaStaffRepository } from "./repository";
import type { StaffMember } from "./types";

const getStaffAccess = cache(async (): Promise<StaffAccess> => {
  // Request time only. With Cache Components, Next also renders the panel in a prerender pass
  // (e.g. after a Server Action). There, Supabase's session check would call Date.now(), which
  // Next rejects, and its aborted fetch would be logged as "Supabase unavailable" although
  // nothing failed. connection() stops that pass here; real requests go on as before.
  await connection();
  const supabase = await createSupabaseServerClient();
  return checkStaffAccess({
    authGateway: createSupabaseAuthGateway(supabase.auth),
    staffRepository: createPrismaStaffRepository(getDb()),
    logger,
  });
});

/** The active staff member of this request, or null. Never redirects. */
export async function getCurrentStaff(): Promise<StaffMember | null> {
  const access = await getStaffAccess();
  return access.status === "ok" ? access.staff : null;
}

/**
 * For pages and layouts: returns the active staff member or redirects. Without a session (or
 * if Supabase does not answer) it goes to the login; with a session that is not active staff,
 * to /admin/login?error=forbidden.
 */
export async function requireStaff(): Promise<StaffMember> {
  const access = await getStaffAccess();
  if (access.status === "ok") return access.staff;
  redirect(accessRedirectTarget(access));
}

/**
 * For Server Actions: ok with the staff member, or UNAUTHORIZED / FORBIDDEN / INTERNAL.
 * Usage: `const auth = await requireStaffForAction(); if (!auth.ok) return auth;`
 */
export async function requireStaffForAction(): Promise<ActionResult<StaffMember>> {
  return accessToActionResult(await getStaffAccess());
}
