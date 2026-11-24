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
