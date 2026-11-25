import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { adminPanelContent } from "@/content/admin-panel";
import type { StaffMember } from "@/features/auth/types";

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

const mocks = vi.hoisted(() => ({ staff: null as StaffMember | null }));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));
vi.mock("@/features/auth/dal", () => ({ getCurrentStaff: async () => mocks.staff }));
vi.mock("@/features/auth/actions", () => ({ signOut: vi.fn() }));

const { LoginSessionCheck } = await import("@/features/auth/components/login-session-check");

const copy = adminPanelContent.forbidden;
const params = (value: Record<string, string>) => Promise.resolve(value);

afterEach(() => {
  mocks.staff = null;
});

describe("LoginSessionCheck", () => {
  it("sends an active staff member straight to /admin", async () => {
    mocks.staff = {
      id: "staff-1",
      authUserId: "u-1",
      email: "titular@example.com",
      fullName: "Laura Gómez",
      role: "ADMIN",
      active: true,
    };

    const error: unknown = await LoginSessionCheck({ searchParams: params({}) }).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(RedirectSignal);
    expect((error as RedirectSignal).url).toBe("/admin");
  });

  it("shows nothing extra on a plain visit", async () => {
    expect(await LoginSessionCheck({ searchParams: params({}) })).toBeNull();
  });

  it("explains ?error=forbidden and offers another account, without details", async () => {
    render(await LoginSessionCheck({ searchParams: params({ error: "forbidden" }) }));

    expect(screen.getByRole("heading", { name: copy.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.switchAccount })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/inactiv|staff/i);
  });

  it("ignores other error values", async () => {
    expect(await LoginSessionCheck({ searchParams: params({ error: "<script>" }) })).toBeNull();
  });
});
