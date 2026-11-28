/**
 * Database access for the e2e that write (SPEC §13): check what a submission stored and delete
 * the E2E- rows afterwards. Playwright runs outside Next, so this does not use getDb()
 * (server-only): it connects with `pg` and the same verified TLS as the app (db-tls.ts).
 *
 * It uses DATABASE_URL from .env.local: it must point to Supabase DEV.
 *
 * The message is stored encrypted (ADR-0017), so rows are found by their email: every e2e row
 * has the lowercase marker in it (`delivered+e2e-<run>-…@resend.dev` from the form,
 * `e2e-<run>-<n>@example.com` from the panel seeds), and its name starts with `E2E-`.
 */
import { readFileSync } from "node:fs";

import { loadEnvConfig } from "@next/env";
import { Client } from "pg";

import { assertNoSslParams, databaseCaPath } from "../../../src/lib/db-tls";

loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

export const e2eEnv = {
  databaseUrl: process.env.DATABASE_URL,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  /** Test user of the panel e2e (F4-07): created by hand in Supabase dev, never in Vercel. */
  staffEmail: process.env.E2E_STAFF_EMAIL?.trim().toLowerCase(),
  staffPassword: process.env.E2E_STAFF_PASSWORD,
};

/** Cloudflare's test site keys that pass on their own (visible and invisible). */
const PASSING_TEST_SITE_KEYS = ["1x00000000000000000000AA", "1x00000000000000000000BB"];

export const usesTurnstileTestKey = () =>
  PASSING_TEST_SITE_KEYS.includes(e2eEnv.turnstileSiteKey ?? "");

export async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const connectionString = e2eEnv.databaseUrl;
  if (!connectionString) throw new Error("Los e2e que escriben necesitan DATABASE_URL (dev).");
  assertNoSslParams("DATABASE_URL", connectionString);
  const client = new Client({
    connectionString,
    ssl: { ca: readFileSync(databaseCaPath(), "utf8"), rejectUnauthorized: true },
  });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

export type StoredInquiry = {
  id: string;
  /** The stored message has the encrypted format (`enc:v1:…`), never the text. */
  messageIsEncrypted: boolean;
  area: string;
  status: string;
  preferredChannel: string;
  safeToContact: boolean | null;
  emailIsPrivate: boolean;
  privacyPolicyVersion: string;
  events: string[];
};

/** `%e2e-<run>-<scenario>%`: matches the emails that carry the marker. */
const emailLike = (marker: string) => `%${marker.toLowerCase()}%`;

/** The inquiry whose email carries the marker, with its event types; null if none. */
export function findInquiryByMarker(marker: string): Promise<StoredInquiry | null> {
  return withClient(async (client) => {
    const { rows } = await client.query<StoredInquiry>(
      `select i.id, i.area, i.status,
              i.message like 'enc:v1:%' as "messageIsEncrypted",
              i.preferred_channel as "preferredChannel",
              i.safe_to_contact as "safeToContact",
              i.email_is_private as "emailIsPrivate",
              i.privacy_policy_version as "privacyPolicyVersion",
              coalesce(array_agg(e.type::text) filter (where e.id is not null), '{}') as events
         from inquiries i
         left join inquiry_events e on e.inquiry_id = i.id
        where i.email like $1
        group by i.id`,
      [emailLike(marker)],
    );
    if (rows.length > 1) throw new Error(`Más de una consulta con el marcador ${marker}.`);
    return rows[0] ?? null;
  });
}

/** Deletes this run's rows (events go with them: ON DELETE CASCADE). Returns how many. */
export function deleteInquiriesByMarker(marker: string): Promise<number> {
  return withClient(async (client) => {
    const { rowCount } = await client.query("delete from inquiries where email like $1", [
      emailLike(marker),
    ]);
    return rowCount ?? 0;
  });
}

/** Deletes E2E- rows older than a day, left by runs that were cut short. Returns how many. */
export function deleteStaleE2eInquiries(): Promise<number> {
  return withClient(async (client) => {
    const { rowCount } = await client.query(
      `delete from inquiries
        where (full_name like 'E2E-%'
               or email like 'delivered+e2e-%@resend.dev'
               or email like 'e2e-%@example.com')
          and created_at < now() - interval '1 day'`,
    );
    return rowCount ?? 0;
  });
}
