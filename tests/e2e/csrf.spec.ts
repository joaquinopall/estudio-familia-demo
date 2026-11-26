/**
 * CSRF on Server Actions (SPEC §10.2, F5-02): Next compares the Origin of every action with
 * the host and aborts the ones from another site. This is Next's own check, not code of ours,
 * so the e2e proves it on the real build.
 *
 * It captures the real login POST from the browser (form-encoded with its action id) and
 * replays it twice: from our own origin (control: the action runs and answers the generic
 * wrong-credentials message, asking Supabase dev like admin-login.spec.ts) and from a foreign
 * origin (must be rejected before the action runs). One login attempt is counted, under a
 * documentation IP of its own.
 */
import { randomUUID } from "node:crypto";

import { type Request, expect, test } from "@playwright/test";

import { adminPanelContent } from "../../src/content/admin-panel";

const copy = adminPanelContent;
const RUN = randomUUID().slice(0, 8);
const CLIENT_IP = `2001:db8:${RUN.slice(0, 4)}:${RUN.slice(4, 8)}::c5f`;
/** Start of the generic login error (no accented letters: the RSC payload may escape them). */
const WRONG_CREDENTIALS = "El email o la contrase";

test.describe("CSRF: Server Actions only from our own origin (SPEC §10.2)", () => {
  test("a login action replayed from another site is rejected before it runs", async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("baseURL is not set");
    await page.setExtraHTTPHeaders({ "x-forwarded-for": CLIENT_IP });
    await page.goto("/admin/login");

    // Capture the action POST without letting it reach the server.
    let captured: Request | undefined;
    await page.route("**/admin/login**", async (route) => {
      const request = route.request();
      if (request.method() === "POST" && request.headers()["next-action"]) {
        captured = request;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await page.getByLabel(copy.login.email).fill(`e2e-${RUN}@example.com`);
    await page.getByLabel(copy.login.password).fill("una-clave-que-no-existe");
    await page.getByRole("button", { name: copy.login.submit }).click();
    await expect.poll(() => captured).toBeDefined();
    if (!captured) return;

    const body = captured.postDataBuffer();
    const headers = { ...(await captured.allHeaders()), "x-forwarded-for": CLIENT_IP };
    const replay = (origin: string) =>
      page.request.post(captured!.url(), {
        headers: { ...headers, origin },
        data: body ?? undefined,
        maxRedirects: 0,
      });

    // Foreign origin: Next aborts the request and the action never answers.
    const foreign = await replay("https://otro-sitio.example");
    expect(foreign.status()).toBeGreaterThanOrEqual(400);
    expect(await foreign.text()).not.toContain(WRONG_CREDENTIALS);

    // Control, same request from our origin: the action runs (so the replay itself is valid).
    const own = await replay(new URL(baseURL).origin);
    expect(own.status()).toBe(200);
    expect(await own.text()).toContain(WRONG_CREDENTIALS);
  });
});
