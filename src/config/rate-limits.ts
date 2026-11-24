/**
 * Anti-abuse limits (SPEC §8.2, ADR-0004). Configuration, not logic: a firm with more traffic
 * can adjust them here. Each name is also the storage prefix, so renaming one resets its
 * counters.
 */
import type { RateLimitRule } from "@/lib/ports/rate-limiter";

export const rateLimits = {
  /** Inquiries per IP: 5 every 10 minutes. */
  inquiryByIp: { name: "inquiry-ip", limit: 5, window: "10 m" },
  /** Inquiries per email: 3 per hour (also limits receipts sent to third parties, §10.2). */
  inquiryByEmail: { name: "inquiry-email", limit: 3, window: "1 h" },
  /** Admin login attempts per IP: 5 every 15 minutes (F4-01). */
  loginByIp: { name: "login-ip", limit: 5, window: "15 m" },
} as const satisfies Record<string, RateLimitRule>;
