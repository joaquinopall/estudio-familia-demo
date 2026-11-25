/**
 * Who may use the admin panel (SPEC §6.4 step 2, NFR-SEC-02, US-06 CA4, ADR-0015).
 * Pure: dependencies come in as parameters, so every case is tested with fakes. dal.ts wires
 * the real ones and turns the result into a redirect or an ActionResult.
 */
import { type ActionResult, fail, ok } from "@/lib/action-result";
import { adminPaths } from "@/lib/admin-paths";
import type { Logger } from "@/lib/logger";
import type { AuthGateway } from "@/lib/ports/auth-gateway";

import type { StaffRepository } from "./staff-service";
import type { StaffMember } from "./types";

export type StaffAccess =
  | { status: "ok"; staff: StaffMember }
  /** No session, or one the Auth server rejects. */
  | { status: "unauthenticated" }
  /** A valid session that is not active staff: no StaffMember, or an inactive one. */
  | { status: "forbidden" }
  /** Supabase Auth or the database did not answer: fail closed. */
  | { status: "unavailable" };

export type StaffAccessDeps = {
  authGateway: Pick<AuthGateway, "getVerifiedUser">;
  staffRepository: Pick<StaffRepository, "findByAuthUserId">;
  logger: Logger;
};

export async function checkStaffAccess(deps: StaffAccessDeps): Promise<StaffAccess> {
  const { logger } = deps;

  const user = await deps.authGateway.getVerifiedUser();
  if (user.status === "none") return { status: "unauthenticated" };
  if (user.status === "unavailable") {
    logger.error("auth.user_check_unavailable", { errorCode: user.errorCode });
    return { status: "unavailable" };
  }

  let staff: StaffMember | null;
  try {
    staff = await deps.staffRepository.findByAuthUserId(user.userId);
  } catch (error) {
    logger.error("auth.staff_lookup_failed", { error });
    return { status: "unavailable" };
  }

  // Both cases look the same from outside; the log tells them apart, without personal data.
  if (!staff) {
    logger.warn("auth.forbidden", { errorCode: "no_staff" });
    return { status: "forbidden" };
  }
  if (!staff.active) {
    logger.warn("auth.forbidden", { errorCode: "inactive", staffId: staff.id });
    return { status: "forbidden" };
  }
  return { status: "ok", staff };
}

/** Where a page sends a request without access (§6.4). */
export function accessRedirectTarget(access: Exclude<StaffAccess, { status: "ok" }>): string {
  return access.status === "forbidden" ? adminPaths.loginForbidden : adminPaths.login;
}

/** The ActionResult an admin action returns without access (§6.5). */
export function accessToActionResult(access: StaffAccess): ActionResult<StaffMember> {
  switch (access.status) {
    case "ok":
      return ok(access.staff);
    case "unauthenticated":
      return fail("UNAUTHORIZED");
    case "forbidden":
      return fail("FORBIDDEN");
    case "unavailable":
      return fail("INTERNAL");
  }
}
