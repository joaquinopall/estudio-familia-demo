/**
 * Barriers of the panel without a valid session (SPEC §6.4, MT-08): the proxy sends /admin/* to
 * the login (F4-03, admin-login.spec.ts), which is never redirected.
 */
import { expect, test } from "@playwright/test";

const pathOf = (location: string | undefined) => new URL(location ?? "", "http://x").pathname;

test.describe("admin without a session", () => {
  for (const path of ["/admin", "/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b"]) {
    test(`redirects ${path} to /admin/login`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });

      expect(response.status()).toBe(307);
      expect(pathOf(response.headers()["location"])).toBe("/admin/login");
    });
  }

  test("remembers the requested page in next, so the login comes back to it (F4-06)", async ({
    request,
  }) => {
    const detail = "/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b";

    const response = await request.get(detail, { maxRedirects: 0 });
    const location = new URL(response.headers()["location"] ?? "", "http://x");

    expect(location.pathname).toBe("/admin/login");
    expect(location.searchParams.get("next")).toBe(detail);
  });

  test("does not redirect the login page (no loop)", async ({ request }) => {
    const response = await request.get("/admin/login", { maxRedirects: 0 });

    expect(response.status()).not.toBe(307);
  });

  test("a forged session cookie does not open the panel", async ({ playwright, baseURL }) => {
    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { cookie: "sb-forged-auth-token=base64-eyJhY2Nlc3NfdG9rZW4iOiJmYWtlIn0" },
    });

    const response = await context.get("/admin", { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(pathOf(response.headers()["location"])).toBe("/admin/login");
    await context.dispose();
  });

  test("leaves public pages alone: no proxy, no session cookies", async ({ request }) => {
    const response = await request.get("/contacto", { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(response.headers()["set-cookie"] ?? "").not.toContain("sb-");
  });
});
