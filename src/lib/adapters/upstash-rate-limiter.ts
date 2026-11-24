/**
 * RateLimiter over Upstash Redis (SPEC §8.2, ADR-0004, ADR-0013). The only file that imports
 * the Upstash SDKs.
 *
 * Upstash lets a request through when Redis does not answer in time (reason "timeout"). This
 * adapter reports that as `unavailable` instead of `allowed`, so the caller decides and logs
 * it (ADR-0013). Keys must already be hashes: Upstash never sees an email or an IP.
 */
import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import {
  type RateLimitResult,
  type RateLimitRule,
  type RateLimiter,
  assertHashedKey,
} from "@/lib/ports/rate-limiter";

/** Storage prefix: `rl:<rule name>`. One Upstash database per installation (ADR-0003). */
export const RATE_LIMIT_PREFIX = "rl";
/** Upstash's default is 5 s; the person is waiting, and on timeout the request goes through. */
export const RATE_LIMIT_TIMEOUT_MS = 2000;

/** The part of Ratelimit this adapter uses (lets tests pass a stub). */
export type RuleLimiter = {
  limit(identifier: string): Promise<{ success: boolean; reset: number; reason?: string }>;
};

export class UpstashRateLimiter implements RateLimiter {
  private readonly limiters = new Map<string, RuleLimiter>();

  constructor(
    private readonly createLimiter: (rule: RateLimitRule) => RuleLimiter,
    private readonly now: () => number = Date.now,
  ) {}

  async limit(rule: RateLimitRule, key: string): Promise<RateLimitResult> {
    assertHashedKey(key);
    try {
      const result = await this.limiterFor(rule).limit(key);
      if (result.reason === "timeout") return { status: "unavailable" };
      if (result.success) return { status: "allowed" };
      const seconds = Math.ceil((result.reset - this.now()) / 1000);
      return { status: "limited", retryAfterSeconds: Math.max(1, seconds) };
    } catch {
      return { status: "unavailable" };
    }
  }

  private limiterFor(rule: RateLimitRule): RuleLimiter {
    let limiter = this.limiters.get(rule.name);
    if (!limiter) {
      limiter = this.createLimiter(rule);
      this.limiters.set(rule.name, limiter);
    }
    return limiter;
  }
}

export function createUpstashRateLimiter(config: { url: string; token: string }): RateLimiter {
  const redis = new Redis({
    url: config.url,
    token: config.token,
    // One quick retry: the limiter already gives up after RATE_LIMIT_TIMEOUT_MS.
    retry: { retries: 1 },
    enableTelemetry: false,
  });
  return new UpstashRateLimiter(
    (rule) =>
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(rule.limit, rule.window),
        prefix: `${RATE_LIMIT_PREFIX}:${rule.name}`,
        analytics: false,
        timeout: RATE_LIMIT_TIMEOUT_MS,
      }),
  );
}
