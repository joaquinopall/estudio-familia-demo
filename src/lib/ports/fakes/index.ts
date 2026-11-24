/**
 * In-memory fakes of the ports, for tests only (SPEC §13: services tested with fakes).
 * They follow the same contract as the real adapters (see __tests__/port-contracts.test.ts).
 * Never import them from application code.
 */
import type {
  CaptchaVerifier,
  CaptchaVerifyInput,
  CaptchaVerifyResult,
} from "@/lib/ports/captcha-verifier";
import type { Clock } from "@/lib/ports/clock";
import type { EmailMessage, EmailSendResult, EmailSender } from "@/lib/ports/email-sender";
import {
  type RateLimitResult,
  type RateLimitRule,
  type RateLimiter,
  assertHashedKey,
} from "@/lib/ports/rate-limiter";

/** Clock frozen at a given date; move it with advance() or set(). */
export class FixedClock implements Clock {
  private current: Date;

  constructor(start: Date | string = "2026-11-24T12:00:00.000Z") {
    this.current = new Date(start);
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  set(date: Date | string): void {
    this.current = new Date(date);
  }
}

/** Records every email; failWith() makes the next sends fail. */
export class FakeEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  private failure: string | null = null;
  private nextId = 1;

  failWith(errorCode: string | null): void {
    this.failure = errorCode;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (this.failure) return { ok: false, errorCode: this.failure };
    this.sent.push(message);
    return { ok: true, id: `fake-email-${this.nextId++}` };
  }
}

/** Answers with a configurable result (ok by default) and records every call. */
export class FakeCaptchaVerifier implements CaptchaVerifier {
  readonly calls: CaptchaVerifyInput[] = [];

  constructor(private result: CaptchaVerifyResult = { status: "ok" }) {}

  respondWith(result: CaptchaVerifyResult): void {
    this.result = result;
  }

  async verify(input: CaptchaVerifyInput): Promise<CaptchaVerifyResult> {
    this.calls.push(input);
    return this.result;
  }
}

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000 } as const;

export function windowToMs(window: RateLimitRule["window"]): number {
  const [amount, unit] = window.split(" ") as [string, keyof typeof UNIT_MS];
  return Number(amount) * UNIT_MS[unit];
}

/** Sliding-window limiter in memory, driven by a Clock. setUnavailable() simulates an outage. */
export class FakeRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private unavailable = false;

  constructor(private readonly clock: Clock = new FixedClock()) {}

  setUnavailable(unavailable: boolean): void {
    this.unavailable = unavailable;
  }

  async limit(rule: RateLimitRule, key: string): Promise<RateLimitResult> {
    assertHashedKey(key);
    if (this.unavailable) return { status: "unavailable" };

    const now = this.clock.now().getTime();
    const windowMs = windowToMs(rule.window);
    const id = `${rule.name}:${key}`;
    const recent = (this.hits.get(id) ?? []).filter((time) => time > now - windowMs);

    if (recent.length >= rule.limit) {
      const oldest = recent[0] ?? now;
      this.hits.set(id, recent);
      return {
        status: "limited",
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
      };
    }
    this.hits.set(id, [...recent, now]);
    return { status: "allowed" };
  }
}
