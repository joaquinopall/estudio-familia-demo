// @vitest-environment node
/**
 * Who may use the panel (SPEC §6.4, US-06 CA4). The four cases of the guide: no session,
 * session without staff, inactive staff and active staff; plus Supabase or the database down.
 */
import { describe, expect, it } from "vitest";

import {
  accessRedirectTarget,
  accessToActionResult,
  checkStaffAccess,
} from "@/features/auth/access";
import { StaffStoreError } from "@/features/auth/errors";
import { DEFAULT_ERROR_MESSAGES } from "@/lib/action-result";
import { createLogger } from "@/lib/logger";
import { FakeAuthGateway } from "@/lib/ports/fakes";

import { FakeStaffRepository } from "./fake-staff-repository";

const USER_ID = "0b8f2a52-5f0e-4d2a-9c61-3a1b2c3d4e5f";

function setup() {
  const authGateway = new FakeAuthGateway();
  const staffRepository = new FakeStaffRepository();
  const logs: string[] = [];
  const logger = createLogger({ write: (_level, line) => logs.push(line) });
  return {
    authGateway,
    staffRepository,
    logs,
    check: () => checkStaffAccess({ authGateway, staffRepository, logger }),
    signIn: () => authGateway.setVerifiedUser({ status: "ok", userId: USER_ID }),
  };
}

const parsed = (logs: string[]) => logs.map((line) => JSON.parse(line) as Record<string, unknown>);

describe("checkStaffAccess", () => {
  it("without a session: unauthenticated, and never looks up staff", async () => {
    const ctx = setup();
    ctx.staffRepository.failWith(new Error("must not be called"));

    expect(await ctx.check()).toEqual({ status: "unauthenticated" });
  });

  it("with a session but no StaffMember: forbidden (US-06 CA4)", async () => {
    const ctx = setup();
    ctx.signIn();

    expect(await ctx.check()).toEqual({ status: "forbidden" });
    expect(parsed(ctx.logs)).toEqual([
      expect.objectContaining({ level: "warn", event: "auth.forbidden", errorCode: "no_staff" }),
    ]);
  });

  it("with an inactive StaffMember: forbidden, logged with its id", async () => {
    const ctx = setup();
    ctx.signIn();
    const member = ctx.staffRepository.addMember({ authUserId: USER_ID, active: false });

    expect(await ctx.check()).toEqual({ status: "forbidden" });
    expect(parsed(ctx.logs)[0]).toMatchObject({ errorCode: "inactive", staffId: member.id });
  });

  it("with an active StaffMember: ok with the member, and logs nothing", async () => {
    const ctx = setup();
    ctx.signIn();
    const member = ctx.staffRepository.addMember({ authUserId: USER_ID });

    expect(await ctx.check()).toEqual({ status: "ok", staff: member });
    expect(ctx.logs).toEqual([]);
  });

  it("never matches another user's StaffMember", async () => {
    const ctx = setup();
    ctx.signIn();
    ctx.staffRepository.addMember({ authUserId: "someone-else" });

    expect(await ctx.check()).toEqual({ status: "forbidden" });
  });

  it("fails closed when Supabase Auth does not answer", async () => {
    const ctx = setup();
    ctx.authGateway.setVerifiedUser({
      status: "unavailable",
      errorCode: "AuthRetryableFetchError",
    });

    expect(await ctx.check()).toEqual({ status: "unavailable" });
    expect(parsed(ctx.logs)[0]).toMatchObject({
      level: "error",
      event: "auth.user_check_unavailable",
      errorCode: "AuthRetryableFetchError",
    });
  });

  it("fails closed when the database does not answer", async () => {
    const ctx = setup();
    ctx.signIn();
    ctx.staffRepository.failWith(new StaffStoreError());

    expect(await ctx.check()).toEqual({ status: "unavailable" });
    expect(parsed(ctx.logs)[0]).toMatchObject({
      event: "auth.staff_lookup_failed",
      errorName: "StaffStoreError",
    });
  });

  it("never logs personal data", async () => {
    const ctx = setup();
    ctx.signIn();
    ctx.staffRepository.addMember({
      authUserId: USER_ID,
      active: false,
      email: "ana@example.com",
      fullName: "Ana Pérez",
    });

    await ctx.check();

    const output = ctx.logs.join("\n");
    for (const value of ["ana@example.com", "Ana", "Pérez"]) expect(output).not.toContain(value);
  });
});

describe("accessRedirectTarget (pages)", () => {
  it("sends forbidden to the login with ?error=forbidden", () => {
    expect(accessRedirectTarget({ status: "forbidden" })).toBe("/admin/login?error=forbidden");
  });

  it.each(["unauthenticated", "unavailable"] as const)("sends %s to the login", (status) => {
    expect(accessRedirectTarget({ status })).toBe("/admin/login");
  });
});

describe("accessToActionResult (actions, §6.5)", () => {
  it.each([
    ["unauthenticated", "UNAUTHORIZED"],
    ["forbidden", "FORBIDDEN"],
    ["unavailable", "INTERNAL"],
  ] as const)("maps %s to %s with a generic message", (status, code) => {
    expect(accessToActionResult({ status })).toEqual({
      ok: false,
      error: { code, message: DEFAULT_ERROR_MESSAGES[code] },
    });
  });

  it("returns the staff member when allowed", () => {
    const staff = new FakeStaffRepository().addMember({ authUserId: USER_ID });

    expect(accessToActionResult({ status: "ok", staff })).toEqual({ ok: true, data: staff });
  });
});
