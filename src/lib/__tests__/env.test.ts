import { afterEach, describe, expect, it, vi } from "vitest";

describe("env (server entry point)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("merges validated public and server variables", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://demo.example.com");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    vi.stubEnv("IP_HASH_SALT", "b".repeat(32));

    const { env } = await import("@/lib/env");

    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://demo.example.com");
    expect(env.NEXT_PUBLIC_DEMO_MODE).toBe(true);
    expect(env.IP_HASH_SALT).toBe("b".repeat(32));
  });

  it("throws on import when a required variable is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    await expect(import("@/lib/env")).rejects.toThrow("NEXT_PUBLIC_SITE_URL");
  });
});
