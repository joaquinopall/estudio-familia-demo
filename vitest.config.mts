import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolves the "@/*" alias from tsconfig.json (native since Vite 8).
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    // Deterministic public values for code that reads publicEnv at import time (layouts,
    // sitemap, JSON-LD). Vitest does not load .env.local; tests can still override them with
    // vi.stubEnv. Never put secrets here.
    env: {
      NEXT_PUBLIC_SITE_URL: "https://demo.example.com",
      NEXT_PUBLIC_DEMO_MODE: "true",
    },
    projects: [
      {
        // `npm run test` and CI: no network, no database.
        extends: true,
        test: {
          name: "unit",
          // Fictitious values for the variables env.ts requires since F3-05. Nothing connects
          // to them: unit tests use fakes. Only here, never in the "db" project (it would
          // shadow the real DATABASE_URL from .env.local).
          env: {
            NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
            NEXT_PUBLIC_SUPABASE_URL: "https://fake-project.supabase.invalid",
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fake_for_tests",
            DATABASE_URL: "postgresql://user:fake-password@db.invalid:6543/postgres",
            RESEND_API_KEY: "re_fake_key_for_tests",
            EMAIL_FROM: "Estudio <avisos@example.com>",
            FIRM_NOTIFICATION_EMAIL: "estudio@example.com",
            TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
            UPSTASH_REDIS_REST_URL: "https://fake.upstash.invalid",
            UPSTASH_REDIS_REST_TOKEN: "fake-upstash-token",
            IP_HASH_SALT: "fake-salt-for-unit-tests-only-0123456789",
            // 32 zero bytes: a valid shape, never a real key (ADR-0017).
            FIELD_ENCRYPTION_KEYS: "test:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
          },
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.{ts,tsx}", "prisma/**/*.test.ts"],
          exclude: ["node_modules/**", "tests/e2e/**", "src/**/*.db.test.ts"],
        },
      },
      {
        // `npm run test:db`: integration against the DEVELOPMENT database (.env.local). Rows
        // are prefixed with "E2E-" and deleted at the end (SPEC §13). Never point .env.local
        // at production while running them.
        extends: true,
        test: {
          name: "db",
          environment: "node",
          setupFiles: ["./tests/setup/load-db-env.ts"],
          include: ["src/**/*.db.test.ts"],
          // One file at a time: they share the database.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**", "src/generated/**"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
