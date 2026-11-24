import { describe, expect, it } from "vitest";

import {
  FakeCaptchaVerifier,
  FakeEmailSender,
  FakeRateLimiter,
  FixedClock,
  windowToMs,
} from "@/lib/ports/fakes";
import type { RateLimitRule } from "@/lib/ports/rate-limiter";

const KEY = "c".repeat(64);
const MESSAGE = { to: "ana@example.com", subject: "Hola", html: "<p>Hola</p>", text: "Hola" };

describe("FixedClock", () => {
  it("returns copies of a fixed date and can move", () => {
    const clock = new FixedClock("2026-11-24T12:00:00.000Z");
    const first = clock.now();
    first.setFullYear(2000);

    expect(clock.now().toISOString()).toBe("2026-11-24T12:00:00.000Z");
    clock.advance(60_000);
    expect(clock.now().toISOString()).toBe("2026-11-24T12:01:00.000Z");
    clock.set("2027-01-01T00:00:00.000Z");
    expect(clock.now().getUTCFullYear()).toBe(2027);
  });
});

describe("FakeEmailSender", () => {
  it("records sent emails and returns ids", async () => {
    const sender = new FakeEmailSender();

    expect(await sender.send(MESSAGE)).toEqual({ ok: true, id: "fake-email-1" });
    expect(await sender.send(MESSAGE)).toEqual({ ok: true, id: "fake-email-2" });
    expect(sender.sent).toEqual([MESSAGE, MESSAGE]);
  });

  it("fails without recording when asked to", async () => {
    const sender = new FakeEmailSender();
    sender.failWith("network_error");

    expect(await sender.send(MESSAGE)).toEqual({ ok: false, errorCode: "network_error" });
    expect(sender.sent).toEqual([]);

    sender.failWith(null);
    expect((await sender.send(MESSAGE)).ok).toBe(true);
  });
});

describe("FakeCaptchaVerifier", () => {
  it("answers ok by default, records calls and can change its answer", async () => {
    const captcha = new FakeCaptchaVerifier();

    expect(await captcha.verify({ token: "t", remoteIp: "203.0.113.7" })).toEqual({
      status: "ok",
    });
    captcha.respondWith({ status: "unavailable", errorCodes: ["timeout"] });
    expect((await captcha.verify({ token: "t" })).status).toBe("unavailable");
    expect(captcha.calls).toHaveLength(2);
  });
});

describe("FakeRateLimiter", () => {
  const rule: RateLimitRule = { name: "test", limit: 2, window: "10 m" };

  it("frees attempts as the window slides", async () => {
    const clock = new FixedClock();
    const limiter = new FakeRateLimiter(clock);

    await limiter.limit(rule, KEY);
    clock.advance(5 * 60_000);
    await limiter.limit(rule, KEY);

    expect(await limiter.limit(rule, KEY)).toEqual({ status: "limited", retryAfterSeconds: 300 });
    clock.advance(5 * 60_000 + 1);
    expect(await limiter.limit(rule, KEY)).toEqual({ status: "allowed" });
  });

  it("simulates an outage", async () => {
    const limiter = new FakeRateLimiter();
    limiter.setUnavailable(true);

    expect(await limiter.limit(rule, KEY)).toEqual({ status: "unavailable" });
  });
});

describe("windowToMs", () => {
  it.each([
    ["30 s", 30_000],
    ["10 m", 600_000],
    ["1 h", 3_600_000],
  ] as const)("%s → %i ms", (window, ms) => {
    expect(windowToMs(window)).toBe(ms);
  });
});
