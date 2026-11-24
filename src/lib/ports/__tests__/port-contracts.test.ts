// @vitest-environment node
/**
 * Contract shared by the fake and the real adapter of each port, so a service test that passes
 * with a fake means the same with the real provider.
 */
import { describe, expect, it } from "vitest";

import { type RuleLimiter, UpstashRateLimiter } from "@/lib/adapters/upstash-rate-limiter";
import { FakeRateLimiter, FixedClock, windowToMs } from "@/lib/ports/fakes";
import {
  InvalidRateLimitKeyError,
  type RateLimitRule,
  type RateLimiter,
} from "@/lib/ports/rate-limiter";

const RULE: RateLimitRule = { name: "contract", limit: 3, window: "10 m" };
const OTHER_RULE: RateLimitRule = { name: "contract-other", limit: 1, window: "1 h" };
const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);

/** Stands in for Redis behind the real adapter: a fixed-window counter per rule and key. */
function upstashWithCounters(clock: FixedClock): RateLimiter {
  const counters = new Map<string, number>();
  return new UpstashRateLimiter(
    (rule): RuleLimiter => ({
      async limit(identifier) {
        const id = `${rule.name}:${identifier}`;
        const count = (counters.get(id) ?? 0) + 1;
        counters.set(id, count);
        const reset = clock.now().getTime() + windowToMs(rule.window);
        return { success: count <= rule.limit, reset };
      },
    }),
    () => clock.now().getTime(),
  );
}

const implementations: [string, (clock: FixedClock) => RateLimiter][] = [
  ["FakeRateLimiter", (clock) => new FakeRateLimiter(clock)],
  ["UpstashRateLimiter", upstashWithCounters],
];

describe.each(implementations)("RateLimiter contract: %s", (_name, make) => {
  it("allows up to the limit, then limits with a positive wait", async () => {
    const limiter = make(new FixedClock());

    for (let i = 0; i < RULE.limit; i++) {
      expect(await limiter.limit(RULE, KEY_A)).toEqual({ status: "allowed" });
    }
    const blocked = await limiter.limit(RULE, KEY_A);
    expect(blocked.status).toBe("limited");
    expect(blocked.status === "limited" && blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each key and each rule separately", async () => {
    const limiter = make(new FixedClock());

    for (let i = 0; i < RULE.limit; i++) await limiter.limit(RULE, KEY_A);

    expect(await limiter.limit(RULE, KEY_B)).toEqual({ status: "allowed" });
    expect(await limiter.limit(OTHER_RULE, KEY_A)).toEqual({ status: "allowed" });
  });

  it("rejects keys that are not hashes", async () => {
    await expect(make(new FixedClock()).limit(RULE, "ana@example.com")).rejects.toBeInstanceOf(
      InvalidRateLimitKeyError,
    );
  });
});
