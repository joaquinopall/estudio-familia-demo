// @vitest-environment node
/**
 * The real signIn/signOut actions: client IP, wiring and redirects. Next's request APIs and
 * Supabase are mocked; the logic itself is covered by sign-in.test.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

const mocks = vi.hoisted(() => ({
  headers: new Headers({ "x-forwarded-for": "203.0.113.7" }),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => mocks.headers }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createServerClient.mockImplementation(async () => ({
    auth: { signInWithPassword: mocks.signInWithPassword, signOut: mocks.signOut },
  })),
}));
vi.mock("@/lib/adapters", async () => {
  const { FakeRateLimiter } = await import("@/lib/ports/fakes");
  const limiter = new FakeRateLimiter();
  return { getRateLimiter: () => limiter };
});

function credentials(password = "una-clave-larga-y-segura") {
  const formData = new FormData();
  formData.set("email", "staff@example.com");
  formData.set("password", password);
  return formData;
}

async function redirectOf(promise: Promise<unknown>): Promise<string> {
  const error: unknown = await promise.catch((thrown: unknown) => thrown);
  if (!(error instanceof RedirectSignal)) throw new Error("expected a redirect");
  return error.url;
}

describe("signIn action", () => {
  afterEach(() => vi.clearAllMocks());

  it("redirects to /admin after a successful sign-in", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    const { signIn } = await import("@/features/auth/actions");

    expect(await redirectOf(signIn(null, credentials()))).toBe("/admin");
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "staff@example.com",
      password: "una-clave-larga-y-segura",
    });
  });

  it("redirects to the validated next after a successful sign-in (F4-06)", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    const { signIn } = await import("@/features/auth/actions");
    const formData = credentials();
    formData.set("next", "/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b");

    expect(await redirectOf(signIn(null, formData))).toBe(
      "/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b",
    );
  });

  it("returns the generic error without redirecting when Supabase rejects the credentials", async () => {
    const { AuthApiError } = await import("@supabase/supabase-js");
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
    });
    const { signIn } = await import("@/features/auth/actions");

    const result = await signIn(null, credentials("incorrecta"));

    expect(result?.error.code).toBe("UNAUTHORIZED");
  });
});

describe("signOut action", () => {
  afterEach(() => vi.clearAllMocks());

  it("signs out this browser only and redirects to the login", async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    const { signOut } = await import("@/features/auth/actions");

    expect(await redirectOf(signOut())).toBe("/admin/login");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("still redirects to the login when Supabase fails", async () => {
    mocks.signOut.mockRejectedValue(new Error("network"));
    const { signOut } = await import("@/features/auth/actions");

    expect(await redirectOf(signOut())).toBe("/admin/login");
  });
});
