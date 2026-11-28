/**
 * The admin panel with a real session (F4-07, SPEC §13: login admin, change status, access
 * denied): login and logout, list and filters, detail with status, notes and history, the
 * email link through the login (F4-06) and access denied.
 *
 * Needs a test user created by hand in Supabase dev and E2E_STAFF_EMAIL / E2E_STAFF_PASSWORD in
 * .env.local (see docs/TESTING.md). Skipped without them. The helpers make that user active
 * staff ("E2E-Staff") by themselves.
 *
 * Serial: the scenarios share the test user, and "access denied" deactivates it for a moment.
 * Writes inquiries whose name and message start with E2E-<run>- and deletes them at the end,
 * with any E2E- inquiry older than a day.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";

import { adminPanelContent } from "../../src/content/admin-panel";
import {
  E2E_STAFF_NAME,
  SEED_MESSAGE,
  SERVER_LOG_FILE,
  ensureE2eStaff,
  hasStaffCredentials,
  seedInquiries,
  setE2eStaffActive,
  signInOnLoginPage,
} from "./support/admin";
import { collectCspViolations } from "./support/csp";
import { deleteInquiriesByMarker, deleteStaleE2eInquiries } from "./support/db";
import { DEV_SERVICES_SKIP_REASON, hasDevServices } from "./support/services";

const copy = adminPanelContent;
const RUN = randomUUID().slice(0, 8);
const MARKER = `E2E-${RUN}`;

/** A documentation IPv6 per scenario: its own login rate limit bucket (5 every 15 minutes). */
const clientIp = (scenario: number) =>
  `2001:db8:${RUN.slice(0, 4)}:${RUN.slice(4, 8)}::a${scenario}`;

/** Three inquiries: A (newest) has no safe channel; B and C differ in area and urgency. */
const SEED = [
  {
    name: "Ana",
    area: "SUCCESSION",
    urgency: "HIGH",
    preferredChannel: "PHONE",
    safeToContact: false,
    emailIsPrivate: false,
    minute: 3,
  },
  {
    name: "Bruno",
    area: "DIVORCE",
    urgency: "LOW",
    preferredChannel: "EMAIL",
    safeToContact: null,
    emailIsPrivate: true,
    minute: 2,
  },
  {
    name: "Carla",
    area: "DIVORCE",
    urgency: "HIGH",
    preferredChannel: "WHATSAPP",
    safeToContact: true,
    emailIsPrivate: true,
    minute: 1,
  },
] as const;

let ids: string[] = [];
const detailPath = (index: number) => `/admin/consultas/${ids[index]}`;
const listPath = `/admin?q=${encodeURIComponent(MARKER)}`;

/** axe with every impact, like the public pages (F5-03, NFR-A11Y-01). */
async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

/** Opens the login with `next` and signs in; lands on `next`. */
async function signInTo(page: Page, scenario: number, next: string) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": clientIp(scenario) });
  await page.goto(`/admin/login?next=${encodeURIComponent(next)}`);
  await signInOnLoginPage(page);
}

test.describe("admin panel with a session (F4-07)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!hasDevServices(), DEV_SERVICES_SKIP_REASON);
  test.skip(
    !hasStaffCredentials(),
    "Needs DATABASE_URL, E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD (Supabase dev) in .env.local.",
  );

  test.beforeAll(async () => {
    await ensureE2eStaff();
    ids = await seedInquiries(MARKER, SEED);
  });

  test.afterAll(async () => {
    // Always leave the test user usable and the database clean, even after a failure.
    await setE2eStaffActive(true);
    const deleted = (await deleteInquiriesByMarker(MARKER)) + (await deleteStaleE2eInquiries());
    test.info().annotations.push({ type: "cleanup", description: `${deleted} E2E- rows deleted` });
  });

  test("signs in, shows the staff name and signs out", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": clientIp(1) });
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);

    await signInOnLoginPage(page);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { level: 1, name: copy.list.title })).toBeVisible();
    await expect(page.getByText(E2E_STAFF_NAME)).toBeVisible();

    await page.getByRole("button", { name: copy.signOut }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("lists newest first, filters through the URL and flags 'No iniciar contacto'", async ({
    page,
  }) => {
    const violations = await collectCspViolations(page);
    await signInTo(page, 2, listPath);
    const rows = page.getByRole("table").getByRole("row");

    await expect(rows).toHaveCount(4); // header + 3
    await expect(rows.nth(1)).toContainText(`${MARKER} Ana`);
    await expect(rows.nth(2)).toContainText(`${MARKER} Bruno`);
    await expect(rows.nth(3)).toContainText(`${MARKER} Carla`);
    await expect(rows.nth(1)).toContainText(copy.list.table.doNotContact);
    await expect(rows.nth(3)).not.toContainText(copy.list.table.doNotContact);
    await expectNoAxeViolations(page);

    await page.getByLabel(copy.list.filters.area).selectOption("DIVORCE");
    await page.getByRole("button", { name: copy.list.filters.submit }).click();
    await expect(page).toHaveURL(/area=DIVORCE/);
    await expect(rows).toHaveCount(3);

    await page.getByLabel(copy.list.filters.urgency).selectOption("HIGH");
    await page.getByRole("button", { name: copy.list.filters.submit }).click();
    await expect(page).toHaveURL(/area=DIVORCE.*urgency=HIGH/);
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1)).toContainText(`${MARKER} Carla`);

    // The filtered URL is shareable: reloading it shows the same list.
    await page.reload();
    await expect(rows).toHaveCount(2);
    expect(violations).toEqual([]); // NFR-SEC-05: login and list under the enforced CSP
  });

  test("changes the status and saves notes, recorded in the history with the actor", async ({
    page,
  }) => {
    const violations = await collectCspViolations(page);
    await signInTo(page, 3, listPath);
    await page
      .getByRole("row", { name: new RegExp(`${MARKER} Carla`) })
      .getByRole("link")
      .click();
    await expect(page).toHaveURL(new RegExp(`${detailPath(2)}$`));
    await expect(page.getByRole("region", { name: copy.detail.contact.title })).toContainText(
      "Contactar por WhatsApp",
    );
    // Stored encrypted (ADR-0017), shown as text.
    await expect(page.getByRole("main")).toContainText(`${MARKER} ${SEED_MESSAGE}`);
    await expectNoAxeViolations(page);

    // Status.
    await page.getByLabel(copy.detail.status.label).selectOption("IN_REVIEW");
    await page.getByRole("button", { name: copy.detail.status.submit }).click();
    await expect(page.getByText(copy.detail.status.changed)).toBeVisible();
    const history = page.getByRole("region", { name: copy.detail.history.title });
    await expect(history.getByRole("listitem").last()).toContainText("Estado: Nueva → En revisión");
    await expect(history.getByRole("listitem").last()).toContainText(E2E_STAFF_NAME);

    // Notes: saved, kept after a reload, and the history never shows their text.
    const notes = `${MARKER} nota privada`;
    await page.getByRole("textbox", { name: copy.detail.notes.label }).fill(notes);
    await page.getByRole("button", { name: copy.detail.notes.submit }).click();
    await expect(page.getByText(copy.detail.notes.saved)).toBeVisible();
    await page.reload();
    await expect(page.getByRole("textbox", { name: copy.detail.notes.label })).toHaveValue(notes);
    await expect(history.getByRole("listitem").last()).toContainText(
      copy.detail.history.notesUpdated,
    );
    await expect(history).not.toContainText("nota privada");

    // The list shows the new status.
    await page.goto(listPath);
    await expect(page.getByRole("row", { name: new RegExp(`${MARKER} Carla`) })).toContainText(
      "En revisión",
    );
    expect(violations).toEqual([]); // NFR-SEC-05: detail and its actions under the enforced CSP
  });

  test("the email link goes through the login and back to the inquiry (F4-06)", async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": clientIp(4) });
    await page.goto(detailPath(0));
    await expect(page).toHaveURL(/\/admin\/login\?next=/);

    await signInOnLoginPage(page);

    await expect(page).toHaveURL(new RegExp(`${detailPath(0)}$`));
    await expect(
      page.getByRole("region", { name: copy.detail.contact.doNotContactTitle }),
    ).toBeVisible();
  });

  test("navigating to an inquiry shows its loading state at once, then the inquiry", async ({
    page,
  }) => {
    await signInTo(page, 6, listPath);
    // A slow server answer, so the loading state has time to show (loading.tsx, Next 16
    // instant navigation). Without it the navigation would wait with nothing on screen.
    await page.route("**/admin/consultas/**", async (route) => {
      if (route.request().headers()["rsc"]) await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });

    await page
      .getByRole("row", { name: new RegExp(`${MARKER} Ana`) })
      .getByRole("link")
      .click();

    await expect(page.getByRole("status").filter({ hasText: copy.detail.loading })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${detailPath(0)}$`));
    await expect(page.getByRole("main")).toContainText(`${MARKER} ${SEED_MESSAGE}`);
    await expect(page.getByRole("status").filter({ hasText: copy.detail.loading })).toHaveCount(0);
  });

  test("access denied: a session that is not active staff sees nothing of the panel", async ({
    page,
  }) => {
    await setE2eStaffActive(false);
    try {
      await signInTo(page, 5, detailPath(1));

      await expect(page).toHaveURL(/\/admin\/login\?error=forbidden$/);
      await expect(page.getByRole("heading", { name: copy.forbidden.title })).toBeVisible();

      for (const path of ["/admin", detailPath(1)]) {
        await page.goto(path);
        await expect(page).toHaveURL(/\/admin\/login\?error=forbidden$/);
        await expect(page.getByText(`${MARKER} Bruno`)).toHaveCount(0);
      }

      await page.getByRole("button", { name: copy.forbidden.switchAccount }).click();
      await expect(page).toHaveURL(/\/admin\/login$/);
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin\/login$/);
    } finally {
      await setE2eStaffActive(true);
    }
  });

  test("the server logged no prerender errors nor false Supabase outages", async () => {
    // Regression guard for the prerender noise fixed on 2026-11-26 (DAL + connection()).
    test.skip(!existsSync(SERVER_LOG_FILE), `No ${SERVER_LOG_FILE} (server started elsewhere).`);
    const log = readFileSync(SERVER_LOG_FILE, "utf8");

    expect(log).not.toContain("while prerendering");
    expect(log).not.toContain("auth.user_check_unavailable");
  });
});
