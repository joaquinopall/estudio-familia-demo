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
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Deterministic public values for code that reads publicEnv at import time (layouts,
    // sitemap, JSON-LD). Vitest does not load .env.local; tests can still override them with
    // vi.stubEnv. Never put secrets here.
    env: {
      NEXT_PUBLIC_SITE_URL: "https://demo.example.com",
      NEXT_PUBLIC_DEMO_MODE: "true",
    },
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
