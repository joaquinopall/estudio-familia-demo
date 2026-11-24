// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

import { rateLimits } from "@/config/rate-limits";
import { InquiryStoreError } from "@/features/inquiries/errors";
import type { NewInquiryForEmail } from "@/features/inquiries/notifications";
import { createInquiryService } from "@/features/inquiries/service";
import {
  CAPTCHA_UNAVAILABLE_MESSAGE,
  createSubmitInquiryHandler,
} from "@/features/inquiries/submit-inquiry";
import { DEFAULT_ERROR_MESSAGES } from "@/lib/action-result";
import { createLogger } from "@/lib/logger";
import { FakeCaptchaVerifier, FakeRateLimiter, FixedClock } from "@/lib/ports/fakes";

import { FakeInquiryRepository } from "./fake-inquiry-repository";

const ID = "7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b";
const IP = "203.0.113.7";
const SALT = "s".repeat(32);

const FIELDS: Record<string, string> = {
  area: "SUCCESSION",
  urgency: "NORMAL",
  message: "Falleció mi papá y queremos iniciar la sucesión con mis hermanos.",
  fullName: "Ana Pérez",
  email: "Ana@Example.com",
  phone: "+54 9 11 5555-1234",
  preferredChannel: "WHATSAPP",
  safeToContact: "true",
  emailIsPrivate: "true",
  consent: "on",
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  website: "",
};

/** Personal data that must never show up in a log line. */
const PII = ["Ana", "Pérez", "example.com", "5555", "sucesión", IP];

function formOf(overrides: Record<string, string | undefined> = {}): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries({ ...FIELDS, ...overrides })) {
    if (value !== undefined) formData.set(key, value);
  }
  return formData;
}

function setup() {
  const clock = new FixedClock("2026-11-24T15:30:00.000Z");
  const repository = new FakeInquiryRepository(() => ID);
  const rateLimiter = new FakeRateLimiter(clock);
  const captchaVerifier = new FakeCaptchaVerifier();
  const emails: NewInquiryForEmail[] = [];
  const afterTasks: (() => Promise<void>)[] = [];
  const logs: string[] = [];
  let sendEmailsError: Error | null = null;

  const submit = createSubmitInquiryHandler({
    rateLimiter,
    captchaVerifier,
    inquiryService: createInquiryService({ repository, clock, privacyPolicyVersion: "1.1" }),
    sendEmails: async (inquiry) => {
      if (sendEmailsError) throw sendEmailsError;
      emails.push(inquiry);
    },
    runAfterResponse: (task) => afterTasks.push(task),
    logger: createLogger({ write: (_level, line) => logs.push(line), now: () => clock.now() }),
    ipHashSalt: SALT,
    randomId: () => "00000000-0000-4000-8000-000000000000",
  });

  return {
    submit: (overrides?: Record<string, string | undefined>, clientIp: string | null = IP) =>
      submit({ formData: formOf(overrides), clientIp }),
    repository,
    rateLimiter,
    captchaVerifier,
    emails,
    logs,
    runAfter: async () => {
      for (const task of afterTasks.splice(0)) await task();
    },
    afterTasks,
    failEmails: (error: Error) => {
      sendEmailsError = error;
    },
  };
}

type Ctx = ReturnType<typeof setup>;
const events = (ctx: Ctx) => ctx.logs.map((line) => JSON.parse(line).event as string);

describe("submitInquiry (FR-04, FR-06, FR-08)", () => {
  let ctx: Ctx;
  beforeEach(() => {
    ctx = setup();
  });

  describe("OK", () => {
    it("stores the inquiry and returns the reference", async () => {
      expect(await ctx.submit()).toEqual({
        ok: true,
        data: { reference: "C-7F3A9B21", doNotContact: false },
      });
      expect(ctx.repository.inquiries).toHaveLength(1);
      expect(ctx.repository.inquiries[0]).toMatchObject({
        email: "ana@example.com",
        safeToContact: true,
        privacyPolicyVersion: "1.1",
      });
      expect(events(ctx)).toContain("inquiry.created");
    });

    it("stores the HMAC of the IP, never the IP", async () => {
      await ctx.submit();
      const { ipHash } = ctx.repository.inquiries[0] ?? {};

      expect(ipHash).toMatch(/^[0-9a-f]{64}$/);
      expect(ipHash).not.toContain(IP);
    });

    it("sends the emails only after responding (FR-08)", async () => {
      await ctx.submit();
      expect(ctx.emails).toEqual([]);
      expect(ctx.afterTasks).toHaveLength(1);

      await ctx.runAfter();
      expect(ctx.emails).toEqual([
        expect.objectContaining({ id: ID, reference: "C-7F3A9B21", email: "ana@example.com" }),
      ]);
    });

    it("tells the form not to promise contact when there is no safe channel (US-03 CA3)", async () => {
      expect(await ctx.submit({ safeToContact: "false", emailIsPrivate: "false" })).toMatchObject({
        ok: true,
        data: { doNotContact: true },
      });
    });
  });

  describe("honeypot (first)", () => {
    it("answers a fake success and stores, checks and sends nothing", async () => {
      const result = await ctx.submit({ website: "https://spam.example" });

      expect(result).toEqual({ ok: true, data: { reference: "C-00000000", doNotContact: false } });
      expect(ctx.repository.inquiries).toEqual([]);
      expect(ctx.captchaVerifier.calls).toEqual([]);
      expect(ctx.afterTasks).toEqual([]);
      expect(events(ctx)).toEqual(["inquiry.honeypot"]);
    });

    it("does not spend rate limit attempts", async () => {
      for (let i = 0; i < 10; i++) await ctx.submit({ website: "x" });
      expect((await ctx.submit()).ok).toBe(true);
    });
  });

  describe("RATE_LIMITED (second)", () => {
    it("blocks the sixth inquiry from the same IP in 10 minutes", async () => {
      for (let i = 0; i < rateLimits.inquiryByIp.limit; i++) {
        await ctx.submit({ email: `persona${i}@example.com` });
      }

      expect(await ctx.submit({ email: "otra@example.com" })).toEqual({
        ok: false,
        error: { code: "RATE_LIMITED", message: DEFAULT_ERROR_MESSAGES.RATE_LIMITED },
      });
    });

    it("blocks the fourth inquiry with the same email in an hour, from any IP", async () => {
      for (let i = 0; i < rateLimits.inquiryByEmail.limit; i++) {
        await ctx.submit({}, `198.51.100.${i}`);
      }

      expect((await ctx.submit({ email: " ANA@example.com " }, "192.0.2.99")).ok).toBe(false);
    });

    it("comes before validation: invalid data from a blocked IP gets RATE_LIMITED", async () => {
      for (let i = 0; i < rateLimits.inquiryByIp.limit; i++) {
        await ctx.submit({ email: `p${i}@example.com` });
      }

      expect(await ctx.submit({ message: "corto", email: "nueva@example.com" })).toMatchObject({
        ok: false,
        error: { code: "RATE_LIMITED" },
      });
    });

    it("lets the inquiry through and logs it when the limiter is down (ADR-0013)", async () => {
      ctx.rateLimiter.setUnavailable(true);

      expect((await ctx.submit()).ok).toBe(true);
      expect(events(ctx)).toContain("rate_limit.unavailable");
    });

    it("skips the per-IP rule when the IP is unknown, and logs it", async () => {
      expect((await ctx.submit({}, null)).ok).toBe(true);
      expect(events(ctx)).toContain("rate_limit.no_client_ip");
      expect(ctx.repository.inquiries[0]?.ipHash).toBeNull();
    });
  });

  describe("VALIDATION (third)", () => {
    it("returns the errors per field and does not call Turnstile", async () => {
      const result = await ctx.submit({ message: "corto", consent: undefined });

      expect(result).toMatchObject({
        ok: false,
        error: {
          code: "VALIDATION",
          fieldErrors: {
            message: ["Contanos un poco más (mínimo 20 caracteres)"],
            consent: ["Necesitamos tu consentimiento para responderte"],
          },
        },
      });
      expect(ctx.captchaVerifier.calls).toEqual([]);
      expect(ctx.repository.inquiries).toEqual([]);
    });
  });

  describe("CAPTCHA_FAILED (fourth)", () => {
    it("rejects an invalid token and sends the token and the IP to the verifier", async () => {
      ctx.captchaVerifier.respondWith({ status: "invalid", errorCodes: ["timeout-or-duplicate"] });

      expect(await ctx.submit()).toEqual({
        ok: false,
        error: { code: "CAPTCHA_FAILED", message: DEFAULT_ERROR_MESSAGES.CAPTCHA_FAILED },
      });
      expect(ctx.captchaVerifier.calls).toEqual([{ token: "XXXX.DUMMY.TOKEN.XXXX", remoteIp: IP }]);
      expect(ctx.repository.inquiries).toEqual([]);
    });

    it("rejects when Turnstile is down and offers WhatsApp (ADR-0013)", async () => {
      ctx.captchaVerifier.respondWith({ status: "unavailable", errorCodes: ["timeout"] });

      expect(await ctx.submit()).toEqual({
        ok: false,
        error: { code: "CAPTCHA_FAILED", message: CAPTCHA_UNAVAILABLE_MESSAGE },
      });
      expect(events(ctx)).toContain("captcha.unavailable");
    });

    it("sends an empty token when the field is missing", async () => {
      ctx.captchaVerifier.respondWith({
        status: "invalid",
        errorCodes: ["missing-input-response"],
      });
      await ctx.submit({ "cf-turnstile-response": undefined });

      expect(ctx.captchaVerifier.calls[0]?.token).toBe("");
    });
  });

  describe("INTERNAL", () => {
    it("answers a generic error when the database fails, and logs only the code", async () => {
      ctx.repository.failWith(new InquiryStoreError());

      expect(await ctx.submit()).toEqual({
        ok: false,
        error: { code: "INTERNAL", message: DEFAULT_ERROR_MESSAGES.INTERNAL },
      });
      expect(ctx.logs.join("\n")).toContain('"errorCode":"InquiryStoreError"');
      expect(ctx.afterTasks).toEqual([]);
    });
  });

  describe("email failure (FR-08, MT-15)", () => {
    it("keeps the inquiry and the OK answer, and logs the failure with the id", async () => {
      ctx.failEmails(new Error("Resend down"));

      expect((await ctx.submit()).ok).toBe(true);
      await ctx.runAfter();

      expect(ctx.repository.inquiries).toHaveLength(1);
      const failure = ctx.logs
        .map((line) => JSON.parse(line))
        .find((entry) => entry.event === "inquiry.emails_failed");
      expect(failure).toMatchObject({ level: "error", inquiryId: ID });
    });
  });

  it("never logs personal data in any branch (NFR-SEC-06)", async () => {
    await ctx.submit();
    await ctx.submit({ website: "x" });
    await ctx.submit({ message: "corto" });
    ctx.captchaVerifier.respondWith({ status: "unavailable", errorCodes: ["timeout"] });
    await ctx.submit();
    ctx.captchaVerifier.respondWith({ status: "ok" });
    ctx.rateLimiter.setUnavailable(true);
    ctx.repository.failWith(new InquiryStoreError());
    await ctx.submit();
    ctx.failEmails(new Error("Ana Pérez ana@example.com"));
    await ctx.runAfter();

    const allLogs = ctx.logs.join("\n");
    for (const value of PII) expect(allLogs).not.toContain(value);
  });
});
