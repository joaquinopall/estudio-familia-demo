// @vitest-environment node
/**
 * The real DAL: wiring and what pages and actions get (SPEC §6.4 step 2). Supabase, Prisma and
 * Next's redirect are mocked; the access rules are covered by access.test.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StaffMember } from "@/features/auth/types";
import type { VerifiedUserOutcome } from "@/lib/ports/auth-gateway";

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

const USER_ID = "0b8f2a52-5f0e-4d2a-9c61-3a1b2c3d4e5f";
const MEMBER: StaffMember = {
  id: "staff-1",
  authUserId: USER_ID,
  email: "titular@example.com",
  fullName: "Laura Gómez",
  role: "ADMIN",
  active: true,
};

const mocks = vi.hoisted(() => ({
  user: { status: "none" } as VerifiedUserOutcome,
  member: null as StaffMember | null,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: {} }),
}));
vi.mock("@/lib/supabase/auth-gateway", () => ({
  createSupabaseAuthGateway: () => ({ getVerifiedUser: async () => mocks.user }),
}));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));
vi.mock("@/features/auth/repository", () => ({
  createPrismaStaffRepository: () => ({
    findByAuthUserId: async (authUserId: string) =>
      mocks.member?.authUserId === authUserId ? mocks.member : null,
  }),
}));

async function redirectOf(promise: Promise<unknown>): Promise<string> {
  const error: unknown = await promise.catch((thrown: unknown) => thrown);
  if (!(error instanceof RedirectSignal)) throw new Error("expected a redirect");
  return error.url;
}

function given(user: VerifiedUserOutcome, member: StaffMember | null = null) {
  mocks.user = user;
  mocks.member = member;
}

afterEach(() => given({ status: "none" }));

describe("requireStaff (pages)", () => {
  it("returns the active staff member", async () => {
    given({ status: "ok", userId: USER_ID }, MEMBER);
    const { requireStaff } = await import("@/features/auth/dal");

    expect(await requireStaff()).toEqual(MEMBER);
  });

  it("redirects to the login without a session", async () => {
    const { requireStaff } = await import("@/features/auth/dal");

    expect(await redirectOf(requireStaff())).toBe("/admin/login");
  });

  it("redirects to the login with ?error=forbidden for a session without staff", async () => {
    given({ status: "ok", userId: USER_ID });
    const { requireStaff } = await import("@/features/auth/dal");

    expect(await redirectOf(requireStaff())).toBe("/admin/login?error=forbidden");
  });

  it("redirects an inactive staff member like any user without access", async () => {
    given({ status: "ok", userId: USER_ID }, { ...MEMBER, active: false });
    const { requireStaff } = await import("@/features/auth/dal");

    expect(await redirectOf(requireStaff())).toBe("/admin/login?error=forbidden");
  });

  it("sends to the login when Supabase does not answer (fails closed)", async () => {
    given({ status: "unavailable", errorCode: "AuthRetryableFetchError" });
    const { requireStaff } = await import("@/features/auth/dal");

    expect(await redirectOf(requireStaff())).toBe("/admin/login");
  });
});

describe("getCurrentStaff", () => {
  it("returns null instead of redirecting", async () => {
    given({ status: "ok", userId: USER_ID }, { ...MEMBER, active: false });
    const { getCurrentStaff } = await import("@/features/auth/dal");

    expect(await getCurrentStaff()).toBeNull();
  });
});

describe("requireStaffForAction (actions, §6.5)", () => {
  it.each<[string, VerifiedUserOutcome, StaffMember | null, string]>([
    ["no session", { status: "none" }, null, "UNAUTHORIZED"],
    ["a session without staff", { status: "ok", userId: USER_ID }, null, "FORBIDDEN"],
    [
      "an inactive member",
      { status: "ok", userId: USER_ID },
      { ...MEMBER, active: false },
      "FORBIDDEN",
    ],
    ["Supabase down", { status: "unavailable", errorCode: "x" }, null, "INTERNAL"],
  ])("returns an error for %s, never redirects", async (_case, user, member, code) => {
    given(user, member);
    const { requireStaffForAction } = await import("@/features/auth/dal");

    const result = await requireStaffForAction();

    expect(result.ok === false && result.error.code).toBe(code);
  });

  it("returns the staff member when allowed", async () => {
    given({ status: "ok", userId: USER_ID }, MEMBER);
    const { requireStaffForAction } = await import("@/features/auth/dal");

    expect(await requireStaffForAction()).toEqual({ ok: true, data: MEMBER });
  });
});
