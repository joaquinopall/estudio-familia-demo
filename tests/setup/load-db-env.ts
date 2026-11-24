/**
 * Setup for `npm run test:db`: loads .env.local like `next dev` does (Vitest sets
 * NODE_ENV=test, and in test mode Next skips .env.local), and refuses to run against
 * production.
 */
import { loadEnvConfig } from "@next/env";

const vercelEnv = process.env.VERCEL_ENV;
if (vercelEnv === "production") {
  throw new Error("test:db no corre en producción (VERCEL_ENV=production).");
}

const testNodeEnv = process.env.NODE_ENV;
Object.assign(process.env, { NODE_ENV: "development" });
loadEnvConfig(process.cwd(), true, { info() {}, error: console.error }, true);
Object.assign(process.env, { NODE_ENV: testNodeEnv });

if (!process.env.DATABASE_URL) {
  throw new Error("test:db necesita DATABASE_URL de Supabase dev en .env.local.");
}
