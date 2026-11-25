/**
 * First barrier of the panel (SPEC §6.4 step 1, MT-08): without a session, the proxy sends
 * /admin/* to the login. The login page itself arrives in F4-03; until then it is a 404.
 */
import { expect, test } from "@playwright/test";

test.describe("admin without a session", () => {
  for (const path of ["/admin", "/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b"]) {
    test(`redirects ${path} to /admin/login`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });

      expect(response.status()).toBe(307);
      expect(new URL(response.headers()["location"] ?? "", "http://x").pathname).toBe(
        "/admin/login",
      );
    });
  }

  test("does not redirect the login page (no loop)", async ({ request }) => {
    const response = await request.get("/admin/login", { maxRedirects: 0 });

    expect(response.status()).not.toBe(307);
  });

  test("leaves public pages alone: no proxy, no session cookies", async ({ request }) => {
    const response = await request.get("/contacto", { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(response.headers()["set-cookie"] ?? "").not.toContain("sb-");
  });
});
