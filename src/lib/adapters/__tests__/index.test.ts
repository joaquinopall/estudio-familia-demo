// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const ALL = {
  RESEND_API_KEY: "re_test_key",
  EMAIL_FROM: "Estudio <avisos@example.com>",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "upstash-token",
};

async function loadWith(vars: Partial<typeof ALL>) {
  for (const key of Object.keys(ALL)) vi.stubEnv(key, "");
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);
  return import("@/lib/adapters");
}

describe("adapter factories (composition root)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("creates each adapter lazily and reuses it", async () => {
    const adapters = await loadWith(ALL);

    expect(adapters.getEmailSender()).toBe(adapters.getEmailSender());
    expect(adapters.getCaptchaVerifier()).toBe(adapters.getCaptchaVerifier());
    expect(adapters.getRateLimiter()).toBe(adapters.getRateLimiter());
    expect(adapters.getClock().now()).toBeInstanceOf(Date);
  });

  it("does not require any credential just to import the module", async () => {
    await expect(loadWith({})).resolves.toBeDefined();
  });

  it.each([
    ["getEmailSender", { EMAIL_FROM: ALL.EMAIL_FROM }, /Resend: faltan RESEND_API_KEY\./],
    ["getEmailSender", {}, /Resend: faltan RESEND_API_KEY, EMAIL_FROM\./],
    ["getCaptchaVerifier", {}, /Turnstile: faltan TURNSTILE_SECRET_KEY\./],
    [
      "getRateLimiter",
      { UPSTASH_REDIS_REST_URL: ALL.UPSTASH_REDIS_REST_URL },
      /Upstash: faltan UPSTASH_REDIS_REST_TOKEN\./,
    ],
  ] as const)("%s names the missing variables, never their values", async (fn, vars, message) => {
    const adapters = await loadWith(vars);
    const call = () => adapters[fn]();

    expect(call).toThrow(adapters.AdapterConfigError);
    expect(call).toThrow(message);
    expect(call).not.toThrow(/avisos@example\.com|example\.upstash\.io/);
  });
});
