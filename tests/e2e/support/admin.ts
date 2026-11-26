/**
 * Helpers of the panel e2e (F4-07): the test staff member, seeded inquiries and the login.
 *
 * The test user is created by hand in Supabase dev (Authentication → Users), with its
 * credentials in .env.local (E2E_STAFF_EMAIL, E2E_STAFF_PASSWORD). These helpers make it active
 * staff by themselves, so a run that was cut short never leaves it half-configured.
 * Everything goes through `pg` against DATABASE_URL (dev), like support/db.ts.
 */
import { type Page, expect } from "@playwright/test";

import { adminPanelContent } from "../../../src/content/admin-panel";
import { e2eEnv, withClient } from "./db";

/** The staff name of the test user. Marked E2E- like every row the e2e touch. */
export const E2E_STAFF_NAME = "E2E-Staff";

/** Server output of the e2e web server (playwright.config.ts), checked after the panel e2e. */
export const SERVER_LOG_FILE = "e2e-server.log";

export const hasStaffCredentials = () =>
  Boolean(e2eEnv.databaseUrl && e2eEnv.staffEmail && e2eEnv.staffPassword);

/**
 * Makes the test user active staff (creates, relinks or reactivates its StaffMember). Fails
 * with a clear message if the user does not exist in Supabase Auth.
 */
export function ensureE2eStaff(): Promise<void> {
  return withClient(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `select id::text as id from auth.users
        where lower(email) = lower($1) and deleted_at is null limit 1`,
      [e2eEnv.staffEmail],
    );
    const authUserId = rows[0]?.id;
    if (!authUserId) {
      throw new Error(
        "El usuario de E2E_STAFF_EMAIL no existe en Supabase Auth (dev). Crealo en Authentication → Users.",
      );
    }
    // By Auth id or by email (an Auth user created again keeps the email, SPEC §7).
    const updated = await client.query(
      `update staff_members
          set auth_user_id = $1::uuid, email = lower($2), full_name = $3, active = true
        where auth_user_id = $1::uuid or email = lower($2)`,
      [authUserId, e2eEnv.staffEmail, E2E_STAFF_NAME],
    );
    if ((updated.rowCount ?? 0) === 0) {
      await client.query(
        `insert into staff_members (id, auth_user_id, email, full_name, role, active)
         values (gen_random_uuid(), $1::uuid, lower($2), $3, 'ADMIN', true)`,
        [authUserId, e2eEnv.staffEmail, E2E_STAFF_NAME],
      );
    }
  });
}

/** Turns the test user's staff membership on or off (the "access denied" scenario). */
export function setE2eStaffActive(active: boolean): Promise<void> {
  return withClient(async (client) => {
    await client.query("update staff_members set active = $1 where email = lower($2)", [
      active,
      e2eEnv.staffEmail,
    ]);
  });
}

export type SeedInquiry = {
  name: string;
  area: "SUCCESSION" | "DIVORCE" | "CHILD_SUPPORT";
  urgency: "LOW" | "NORMAL" | "HIGH";
  preferredChannel: "WHATSAPP" | "PHONE" | "EMAIL";
  safeToContact: boolean | null;
  emailIsPrivate: boolean;
  /** Minutes after a fixed moment: a larger value is a newer inquiry. */
  minute: number;
};

/**
 * Inserts inquiries with their CREATED event. Names and messages start with `marker`, so the
 * list can be narrowed to them and the cleanup finds them. Returns their ids, in input order.
 */
export function seedInquiries(
  marker: string,
  inquiries: readonly SeedInquiry[],
): Promise<string[]> {
  return withClient(async (client) => {
    const ids: string[] = [];
    for (const [index, inquiry] of inquiries.entries()) {
      const createdAt = new Date(Date.UTC(2026, 10, 26, 12, inquiry.minute));
      const { rows } = await client.query<{ id: string }>(
        `insert into inquiries (id, created_at, updated_at, full_name, email, phone, area, urgency,
                                message, preferred_channel, safe_to_contact, email_is_private,
                                consent_at, privacy_policy_version)
         values (gen_random_uuid(), $1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $1, '1.1')
         returning id::text as id`,
        [
          createdAt,
          `${marker} ${inquiry.name}`,
          `${marker.toLowerCase()}-${index}@example.com`,
          inquiry.preferredChannel === "EMAIL" ? null : "+54 9 11 5555-0000",
          inquiry.area,
          inquiry.urgency,
          `${marker} consulta de prueba de los e2e del panel; se borra al terminar.`,
          inquiry.preferredChannel,
          inquiry.safeToContact,
          inquiry.emailIsPrivate,
        ],
      );
      const id = rows[0]?.id ?? "";
      await client.query(
        `insert into inquiry_events (id, inquiry_id, type, created_at)
         values (gen_random_uuid(), $1::uuid, 'CREATED', $2)`,
        [id, createdAt],
      );
      ids.push(id);
    }
    return ids;
  });
}

/**
 * Signs in through the login page, as a person would. The page must already be on the login
 * (it may carry a `next`). Each scenario passes its own documentation IP in x-forwarded-for,
 * so the e2e never spend the login rate limit of other runs or of manual tests.
 */
export async function signInOnLoginPage(page: Page): Promise<void> {
  const copy = adminPanelContent.login;
  await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible();
  await page.getByLabel(copy.email).fill(e2eEnv.staffEmail ?? "");
  await page.getByLabel(copy.password).fill(e2eEnv.staffPassword ?? "");
  await page.getByRole("button", { name: copy.submit }).click();
}
