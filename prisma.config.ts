/**
 * Prisma CLI configuration (Prisma 7, ADR-0012).
 *
 * - Loads the .env* files with the same rules as `next dev` (Prisma 7 does not load them itself).
 *   Variables already set in the shell win, so production migrations run with
 *   `DIRECT_URL=... npm run db:deploy` and never read .env.local.
 * - Validates them with the same schema as the app (src/lib/env.schema.ts).
 * - Uses DIRECT_URL (session pooler or direct connection): migrations cannot go through the
 *   transaction pooler. The app uses DATABASE_URL (pooler) in src/lib/db.ts.
 * - Adds verified TLS against Supabase's CA (src/lib/db-tls.ts). DIRECT_URL must not carry
 *   ssl* parameters.
 *
 * The URL is optional here so that `prisma generate` (postinstall, CI, Vercel) works without
 * database credentials. `prisma migrate` fails with Prisma's own message if it is missing.
 */
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

import { databaseCaPath, withVerifiedTlsForPrismaCli } from "./src/lib/db-tls";
import { parseServerEnv } from "./src/lib/env.schema";

loadEnvConfig(process.cwd(), true);

const { DIRECT_URL } = parseServerEnv(process.env);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: DIRECT_URL && withVerifiedTlsForPrismaCli(DIRECT_URL, databaseCaPath(import.meta.dirname)),
  },
});
