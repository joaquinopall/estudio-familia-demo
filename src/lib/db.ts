/**
 * Prisma client singleton (SPEC §6.2, ADR-0002, ADR-0012). Only repositories import it.
 *
 * - Connects through the Supabase pooler (DATABASE_URL, transaction mode) with the pg driver
 *   adapter that Prisma 7 requires (NFR-ESC-01).
 * - Lazy: nothing connects on import, so `next build` and tests never touch the database.
 *   Creating the client does not open a connection either; the first query does.
 * - Cached on globalThis so dev hot reloads reuse the same pool instead of opening new ones.
 * - TLS with full verification against Supabase's root CA (src/lib/db-tls.ts). Without it,
 *   pg connects in plain text; with a bare sslmode=require it rejects the certificate,
 *   because Node does not trust Supabase's CA.
 */
import "server-only";

import { readFileSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

import { assertNoSslParams, databaseCaPath } from "./db-tls";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Connections per server instance. Kept small: each Vercel instance has its own pool and
 * the Supabase pooler multiplexes them onto a few Postgres connections.
 */
export const POOL_MAX_CONNECTIONS = 5;

/** next.config.ts ships the CA with the server bundle (outputFileTracingIncludes). */
export const DATABASE_CA_PATH = databaseCaPath();

export function createDb(
  connectionString: string,
  ca: string = readFileSync(DATABASE_CA_PATH, "utf8"),
): PrismaClient {
  // SSL parameters in the URL would override the `ssl` option below.
  assertNoSslParams("DATABASE_URL", connectionString);
  const adapter = new PrismaPg(
    {
      connectionString,
      max: POOL_MAX_CONNECTIONS,
      ssl: { ca, rejectUnauthorized: true },
    },
    // Only the error name is logged: pg messages may include the host or query values.
    { onPoolError: (error) => logger.error("db.pool_error", { error }) },
  );
  return new PrismaClient({ adapter });
}

const globalForDb = globalThis as typeof globalThis & { __prismaClient?: PrismaClient };

/** DATABASE_URL is required by env.ts: a missing value fails when the app starts, naming it. */
export function getDb(): PrismaClient {
  globalForDb.__prismaClient ??= createDb(env.DATABASE_URL);
  return globalForDb.__prismaClient;
}
