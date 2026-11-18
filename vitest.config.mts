import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolves the "@/*" alias from tsconfig.json (native since Vite 8).
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
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
