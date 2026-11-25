import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Tests run against the production build, as recommended by the Next.js testing guide.
  webServer: {
    command: "npm run build && npm run start",
    url: BASE_URL,
    // Never reuse a running server (e.g. `npm run dev`): it would ignore the env below, and the
    // submission e2e would email a real inbox. If port 3000 is busy, the run fails right away.
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      // Deterministic demo banner for the layout e2e, regardless of the local .env.local.
      NEXT_PUBLIC_DEMO_MODE: "true",
      // The submission e2e send real emails: the firm notice goes to Resend's test address,
      // which simulates a delivery without reaching any inbox (inquiry-submit.spec.ts).
      FIRM_NOTIFICATION_EMAIL: "delivered+e2e-firm@resend.dev",
    },
  },
});
