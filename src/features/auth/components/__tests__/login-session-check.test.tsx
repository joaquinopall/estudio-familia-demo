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

const DETAIL = "/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b";

const signedInAsStaff = () => {
  mocks.staff = {
    id: "staff-1",
    authUserId: "u-1",
    email: "titular@example.com",
    fullName: "Laura Gómez",
    role: "ADMIN",
    active: true,
  };
};

async function redirectOf(promise: Promise<unknown>): Promise<string> {
  const error: unknown = await promise.catch((thrown: unknown) => thrown);
  if (!(error instanceof RedirectSignal)) throw new Error("expected a redirect");
  return error.url;
}

async function renderCheck(values: Record<string, string>) {
  return render(await LoginSessionCheck({ searchParams: params(values) }));
}

const nextField = () => document.querySelector<HTMLInputElement>('input[name="next"]');

describe("LoginSessionCheck", () => {
  it("sends an active staff member straight to /admin", async () => {
    signedInAsStaff();

    expect(await redirectOf(LoginSessionCheck({ searchParams: params({}) }))).toBe("/admin");
  });

  it("sends an active staff member to a valid next (F4-06)", async () => {
    signedInAsStaff();

    expect(await redirectOf(LoginSessionCheck({ searchParams: params({ next: DETAIL }) }))).toBe(
      DETAIL,
    );
  });

  it("never follows a next outside the panel (open redirect, §10.2)", async () => {
    signedInAsStaff();

    expect(
      await redirectOf(LoginSessionCheck({ searchParams: params({ next: "//evil.example" }) })),
    ).toBe("/admin");
  });

  it("shows nothing extra on a plain visit", async () => {
    const { container } = await renderCheck({});

    expect(container).toBeEmptyDOMElement();
  });

  it("adds a valid next as a hidden field of the login form", async () => {
    await renderCheck({ next: DETAIL });

    expect(nextField()).toHaveValue(DETAIL);
    expect(nextField()).toHaveAttribute("form", "login-form");
  });

  it.each(["https://evil.example", "//evil.example", "/contacto", "/admin/login"])(
    "adds no hidden field for next=%s",
    async (next) => {
      await renderCheck({ next });

      expect(nextField()).toBeNull();
    },
  );

  it("explains ?error=forbidden and offers another account, without details", async () => {
    render(await LoginSessionCheck({ searchParams: params({ error: "forbidden" }) }));

    expect(screen.getByRole("heading", { name: copy.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.switchAccount })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/inactiv|staff/i);
  });

  it("ignores other error values", async () => {
    const { container } = await renderCheck({ error: "<script>" });

    expect(container).toBeEmptyDOMElement();
  });
});
