// @vitest-environment node
/**
 * Session refresh and redirect of the proxy (SPEC §6.4 step 1). @supabase/ssr is mocked: each
 * test decides what getClaims() answers and whether it "refreshes" the session through setAll.
 */
import type { CookieMethodsServer, CookieOptionsWithName } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "@/lib/logger";
import { resolveAdminRedirect, updateSession } from "@/lib/supabase/session";

type ClientOptions = { cookies: CookieMethodsServer; cookieOptions?: CookieOptionsWithName };
type ClaimsAnswer = { data: { claims: { sub?: string } } | null; error: Error | null };

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));

const SESSION = { data: { claims: { sub: "u-1" } }, error: null } satisfies ClaimsAnswer;
const NO_SESSION = { data: null, error: null } satisfies ClaimsAnswer;
const NO_CACHE = "private, no-cache, no-store, must-revalidate, max-age=0";

/** Makes getClaims() answer `claims`, optionally writing refreshed cookies first. */
function supabaseAnswering(claims: ClaimsAnswer | Error, refresh = false) {
  let options: ClientOptions | undefined;
  mocks.createServerClient.mockImplementation((_url: string, _key: string, opts: ClientOptions) => {
    options = opts;
    return {
      auth: {
        getClaims: async () => {
          if (refresh) {
            await opts.cookies.setAll?.(
              [
                {
                  name: "sb-ref-auth-token",
                  value: "new-token",
                  options: { ...opts.cookieOptions },
                },
              ],
              { "Cache-Control": NO_CACHE, Expires: "0", Pragma: "no-cache" },
            );
          }
          if (claims instanceof Error) throw claims;
          return claims;
        },
      },
    };
  });
  return { options: () => options };
}

const logs: string[] = [];
const config = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseKey: "sb_publishable_test",
  siteUrl: "https://demo.example.com",
  logger: createLogger({ write: (_level, line) => logs.push(line) }),
};

const run = (path: string) =>
  updateSession(new NextRequest(new URL(path, "https://demo.example.com")), config);

afterEach(() => {
  vi.clearAllMocks();
  logs.length = 0;
});

describe("resolveAdminRedirect", () => {
  it.each(["/admin", "/admin/consultas/123"])("sends %s to the login without a session", (path) => {
    expect(resolveAdminRedirect(path, false)).toBe("/admin/login");
  });

  it("never redirects the login itself (no loop)", () => {
    expect(resolveAdminRedirect("/admin/login", false)).toBeNull();
  });

  it("lets a session through", () => {
    expect(resolveAdminRedirect("/admin", true)).toBeNull();
  });

  it.each(["/", "/contacto", "/administracion"])("ignores %s, outside the panel", (path) => {
    expect(resolveAdminRedirect(path, false)).toBeNull();
  });
});

describe("updateSession", () => {
  it("redirects /admin to /admin/login without a session, dropping the query", async () => {
    supabaseAnswering(NO_SESSION);

    const response = await run("/admin/consultas/123?estado=NEW");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://demo.example.com/admin/login");
  });

  it("lets the request through with a verified session", async () => {
    supabaseAnswering(SESSION);

    const response = await run("/admin");

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not redirect the login page", async () => {
    supabaseAnswering(NO_SESSION);

    const response = await run("/admin/login");

    expect(response.headers.get("location")).toBeNull();
  });

  it("treats a getClaims() error as no session", async () => {
    supabaseAnswering({ data: null, error: new Error("invalid JWT") });

    expect((await run("/admin")).headers.get("location")).toContain("/admin/login");
  });

  it("fails closed and logs it when getClaims() throws", async () => {
    supabaseAnswering(new TypeError("fetch failed"));

    const response = await run("/admin");

    expect(response.headers.get("location")).toContain("/admin/login");
    expect(JSON.parse(logs[0] ?? "{}")).toMatchObject({
      event: "auth.session_check_failed",
      errorName: "TypeError",
    });
  });

  it("writes refreshed cookies and the no-cache headers on the response", async () => {
    supabaseAnswering(SESSION, true);

    const response = await run("/admin");

    expect(response.cookies.get("sb-ref-auth-token")?.value).toBe("new-token");
    expect(response.headers.get("cache-control")).toBe(NO_CACHE);
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("keeps the cookies and the no-cache headers when it redirects", async () => {
    supabaseAnswering(NO_SESSION, true);

    const response = await run("/admin");

    expect(response.headers.get("location")).toContain("/admin/login");
    expect(response.cookies.get("sb-ref-auth-token")?.value).toBe("new-token");
    expect(response.headers.get("cache-control")).toBe(NO_CACHE);
  });

  it("sets the session cookies httpOnly, Secure and SameSite=Lax (NFR-SEC-07)", async () => {
    supabaseAnswering(SESSION, true);

    const response = await run("/admin");
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
  });

  it("creates the client with the project URL, the publishable key and the cookie options", async () => {
    const supabase = supabaseAnswering(SESSION);

    await run("/admin");

    expect(mocks.createServerClient).toHaveBeenCalledWith(
      config.supabaseUrl,
      config.supabaseKey,
      expect.anything(),
    );
    expect(supabase.options()?.cookieOptions).toMatchObject({ httpOnly: true, secure: true });
  });
});
