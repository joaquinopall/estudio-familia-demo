/**
 * Port for rate limiting (SPEC §8.2, ADR-0004, ADR-0013). Adapter:
 * lib/adapters/upstash-rate-limiter.ts. Rules: config/rate-limits.ts.
 *
 * Never throws for provider failures. `unavailable` means the limiter could not decide
 * (timeout, network): the caller lets the request through and logs it, per ADR-0013.
 */

/** Duration accepted by the rules: "<n> s|m|h". */
export type RateLimitWindow = `${number} ${"s" | "m" | "h"}`;

export type RateLimitRule = {
  /** Stable name, used as the storage prefix. Lowercase kebab-case. */
  name: string;
  /** Maximum attempts allowed inside the window. */
  limit: number;
  window: RateLimitWindow;
};

export type RateLimitResult =
  | { status: "allowed" }
  | { status: "limited"; retryAfterSeconds: number }
  | { status: "unavailable" };

/**
 * The key must be a hex SHA-256 or HMAC-SHA256 digest (64 characters), never an email or an
 * IP: the provider stores it (NFR-SEC-06). Adapters reject anything else.
 */
export const RATE_LIMIT_KEY_PATTERN = /^[0-9a-f]{64}$/;

export class InvalidRateLimitKeyError extends Error {
  override readonly name = "InvalidRateLimitKeyError";
  constructor() {
    super("La clave del rate limit tiene que ser un hash hexadecimal de 64 caracteres.");
  }
}

export interface RateLimiter {
  limit(rule: RateLimitRule, key: string): Promise<RateLimitResult>;
}

/** Shared by every RateLimiter implementation, so fakes enforce the same contract. */
export function assertHashedKey(key: string): void {
  if (!RATE_LIMIT_KEY_PATTERN.test(key)) throw new InvalidRateLimitKeyError();
}
