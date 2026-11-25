/**
 * Database access for the e2e that write (SPEC §13): check what a submission stored and delete
 * the E2E- rows afterwards. Playwright runs outside Next, so this does not use getDb()
 * (server-only): it connects with `pg` and the same verified TLS as the app (db-tls.ts).
 *
 * It uses DATABASE_URL from .env.local: it must point to Supabase DEV.
 */
import { readFileSync } from "node:fs";

import { loadEnvConfig } from "@next/env";
import { Client } from "pg";

import { assertNoSslParams, databaseCaPath } from "../../../src/lib/db-tls";

loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

export const e2eEnv = {
  databaseUrl: process.env.DATABASE_URL,
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
};

/** Cloudflare's test site keys that pass on their own (visible and invisible). */
const PASSING_TEST_SITE_KEYS = ["1x00000000000000000000AA", "1x00000000000000000000BB"];

export const usesTurnstileTestKey = () =>
  PASSING_TEST_SITE_KEYS.includes(e2eEnv.turnstileSiteKey ?? "");

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
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
  area: string;
  status: string;
  preferredChannel: string;
  safeToContact: boolean | null;
  emailIsPrivate: boolean;
  privacyPolicyVersion: string;
  events: string[];
};

/** The inquiry whose message starts with the marker, with its event types; null if none. */
export function findInquiryByMarker(marker: string): Promise<StoredInquiry | null> {
  return withClient(async (client) => {
    const { rows } = await client.query<StoredInquiry>(
      `select i.id, i.area, i.status,
              i.preferred_channel as "preferredChannel",
              i.safe_to_contact as "safeToContact",
              i.email_is_private as "emailIsPrivate",
              i.privacy_policy_version as "privacyPolicyVersion",
              coalesce(array_agg(e.type::text) filter (where e.id is not null), '{}') as events
         from inquiries i
         left join inquiry_events e on e.inquiry_id = i.id
        where i.message like $1
        group by i.id`,
      [`${marker}%`],
    );
    if (rows.length > 1) throw new Error(`Más de una consulta con el marcador ${marker}.`);
    return rows[0] ?? null;
  });
}

/** Deletes this run's rows (events go with them: ON DELETE CASCADE). Returns how many. */
export function deleteInquiriesByMarker(marker: string): Promise<number> {
  return withClient(async (client) => {
    const { rowCount } = await client.query("delete from inquiries where message like $1", [
      `${marker}%`,
    ]);
    return rowCount ?? 0;
  });
}

/** Deletes E2E- rows older than a day, left by runs that were cut short. Returns how many. */
export function deleteStaleE2eInquiries(): Promise<number> {
  return withClient(async (client) => {
    const { rowCount } = await client.query(
      "delete from inquiries where message like 'E2E-%' and created_at < now() - interval '1 day'",
    );
    return rowCount ?? 0;
  });
}
