// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

describe("adapter factories (composition root)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("creates each adapter lazily and reuses it", async () => {
    const adapters = await import("@/lib/adapters");

    expect(adapters.getEmailSender()).toBe(adapters.getEmailSender());
    expect(adapters.getCaptchaVerifier()).toBe(adapters.getCaptchaVerifier());
    expect(adapters.getRateLimiter()).toBe(adapters.getRateLimiter());
    expect(adapters.getClock().now()).toBeInstanceOf(Date);
  });

  it.each(["RESEND_API_KEY", "TURNSTILE_SECRET_KEY", "UPSTASH_REDIS_REST_TOKEN"])(
    "fails on import, naming %s, when it is missing (never its value)",
    async (variable) => {
      vi.stubEnv(variable, "");

      const rejection = await import("@/lib/adapters").catch((error: unknown) => error);
      expect(String(rejection)).toContain(`${variable}: es obligatoria`);
      expect(String(rejection)).not.toMatch(/fake-|example\.upstash/);
    },
  );
});
