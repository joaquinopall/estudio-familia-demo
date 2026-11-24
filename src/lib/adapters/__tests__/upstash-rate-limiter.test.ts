// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { rateLimits } from "@/config/rate-limits";
import { type RuleLimiter, UpstashRateLimiter } from "@/lib/adapters/upstash-rate-limiter";
import { InvalidRateLimitKeyError } from "@/lib/ports/rate-limiter";

const KEY = "a".repeat(64);
const NOW = 1_800_000_000_000;

function limiterReturning(result: Awaited<ReturnType<RuleLimiter["limit"]>> | Error) {
  const limit = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const createLimiter = vi.fn(() => ({ limit }));
  return { rateLimiter: new UpstashRateLimiter(createLimiter, () => NOW), limit, createLimiter };
}

describe("UpstashRateLimiter", () => {
  it("allows when Upstash says success", async () => {
    const { rateLimiter, limit } = limiterReturning({ success: true, reset: NOW + 60_000 });

    expect(await rateLimiter.limit(rateLimits.inquiryByIp, KEY)).toEqual({ status: "allowed" });
    expect(limit).toHaveBeenCalledWith(KEY);
  });

  it("limits and says how long to wait, rounded up", async () => {
    const { rateLimiter } = limiterReturning({ success: false, reset: NOW + 90_500 });

    expect(await rateLimiter.limit(rateLimits.inquiryByIp, KEY)).toEqual({
      status: "limited",
      retryAfterSeconds: 91,
    });
  });

  it("never asks to wait less than 1 second", async () => {
    const { rateLimiter } = limiterReturning({ success: false, reset: NOW - 5 });

    expect(await rateLimiter.limit(rateLimits.inquiryByIp, KEY)).toEqual({
      status: "limited",
      retryAfterSeconds: 1,
    });
  });

  it("reports a Redis timeout as unavailable, not as allowed", async () => {
    const { rateLimiter } = limiterReturning({ success: true, reset: 0, reason: "timeout" });

    expect(await rateLimiter.limit(rateLimits.inquiryByIp, KEY)).toEqual({
      status: "unavailable",
    });
  });

  it("never throws: a Redis error is unavailable", async () => {
    const { rateLimiter } = limiterReturning(new Error("ECONNREFUSED"));

    expect(await rateLimiter.limit(rateLimits.inquiryByIp, KEY)).toEqual({
      status: "unavailable",
    });
  });

  it.each(["ana@example.com", "203.0.113.7", "A".repeat(64), "a".repeat(63), ""])(
    "rejects a key that is not a hash (%j), so Upstash never sees personal data",
    async (key) => {
      const { rateLimiter, limit } = limiterReturning({ success: true, reset: NOW });

      await expect(rateLimiter.limit(rateLimits.inquiryByIp, key)).rejects.toBeInstanceOf(
        InvalidRateLimitKeyError,
      );
      expect(limit).not.toHaveBeenCalled();
    },
  );

  it("creates one limiter per rule and reuses it", async () => {
    const { rateLimiter, createLimiter } = limiterReturning({ success: true, reset: NOW });

    await rateLimiter.limit(rateLimits.inquiryByIp, KEY);
    await rateLimiter.limit(rateLimits.inquiryByIp, KEY);
    await rateLimiter.limit(rateLimits.inquiryByEmail, KEY);

    expect(createLimiter).toHaveBeenCalledTimes(2);
    expect(createLimiter).toHaveBeenCalledWith(rateLimits.inquiryByIp);
    expect(createLimiter).toHaveBeenCalledWith(rateLimits.inquiryByEmail);
  });
});
