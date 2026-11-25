// @vitest-environment node
import { describe, expect, it } from "vitest";

import { rateLimits } from "@/config/rate-limits";
import {
  INVALID_CREDENTIALS_MESSAGE,
  createSignInHandler,
  signOutWith,
} from "@/features/auth/sign-in";
import { DEFAULT_ERROR_MESSAGES } from "@/lib/action-result";
import { createLogger } from "@/lib/logger";
import type { SignInOutcome } from "@/lib/ports/auth-gateway";
import { FakeAuthGateway, FakeRateLimiter, FixedClock } from "@/lib/ports/fakes";

const IP = "203.0.113.7";
const SALT = "s".repeat(32);
const ACCOUNT = { email: "staff@example.com", password: "una-clave-larga-y-segura" };

/** Personal data and secrets that must never show up in a log line. */
const SENSITIVE = ["staff", "example.com", ACCOUNT.password, IP];

function formOf(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

function setup() {
  const clock = new FixedClock();
  const rateLimiter = new FakeRateLimiter(clock);
  const authGateway = new FakeAuthGateway(ACCOUNT);
  const logs: string[] = [];
  const logger = createLogger({ write: (_level, line) => logs.push(line) });

  const signIn = createSignInHandler({ rateLimiter, authGateway, logger, ipHashSalt: SALT });

  return {
    signIn: (fields: Record<string, string> = ACCOUNT, clientIp: string | null = IP) =>
      signIn({ formData: formOf(fields), clientIp }),
    rateLimiter,
    authGateway,
    logger,
    logs,
    clock,
  };
}

const events = (logs: string[]) =>
  logs.map((line) => (JSON.parse(line) as { event: string }).event);

describe("signIn handler", () => {
  it("signs in with the right credentials, normalizing the email", async () => {
    const ctx = setup();

    const result = await ctx.signIn({ ...ACCOUNT, email: " Staff@Example.com " });

    expect(result).toEqual({ ok: true, data: { redirectTo: "/admin" } });
    expect(ctx.authGateway.signInCalls).toEqual([ACCOUNT]);
    expect(events(ctx.logs)).toEqual(["auth.signed_in"]);
  });

  it("goes back to the page that asked for the login (F4-06)", async () => {
    const detail = "/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b";

    const result = await setup().signIn({ ...ACCOUNT, next: detail });

    expect(result).toEqual({ ok: true, data: { redirectTo: detail } });
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/contacto",
    "/admin/login",
  ])("ignores next=%s and goes to /admin (no open redirect, §10.2)", async (next) => {
    const result = await setup().signIn({ ...ACCOUNT, next });

    expect(result).toEqual({ ok: true, data: { redirectTo: "/admin" } });
  });

  it("does not let next skip any check: wrong credentials still fail", async () => {
    const ctx = setup();

    const result = await ctx.signIn({ ...ACCOUNT, password: "incorrecta", next: "/admin" });

    expect(result.ok === false && result.error.code).toBe("UNAUTHORIZED");
  });

  it("returns VALIDATION with field errors and never calls Supabase", async () => {
    const ctx = setup();

    const result = await ctx.signIn({ email: "no-es-un-email", password: "" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION");
    expect(Object.keys(result.error.fieldErrors ?? {})).toEqual(["email", "password"]);
    expect(ctx.authGateway.signInCalls).toHaveLength(0);
  });

  it.each<[string, SignInOutcome]>([
    ["wrong password", { status: "invalid_credentials", errorCode: "invalid_credentials" }],
    ["unconfirmed email", { status: "invalid_credentials", errorCode: "email_not_confirmed" }],
  ])("answers a %s with the same generic UNAUTHORIZED message", async (_case, outcome) => {
    const ctx = setup();
    ctx.authGateway.respondWith(outcome);

    const result = await ctx.signIn();

    expect(result).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED", message: INVALID_CREDENTIALS_MESSAGE },
      values: { email: ACCOUNT.email },
    });
  });

  it("gives an unknown email exactly the same error as a wrong password (§6.5)", async () => {
    const ctx = setup();

    const unknownEmail = await ctx.signIn({ ...ACCOUNT, email: "nadie@example.com" });
    const wrongPassword = await ctx.signIn({ ...ACCOUNT, password: "otra-clave-incorrecta" });

    expect(unknownEmail.ok === false && unknownEmail.error).toEqual(
      wrongPassword.ok === false && wrongPassword.error,
    );
  });

  it.each<[string, SignInOutcome | null, Record<string, string>]>([
    ["rejected credentials", null, { ...ACCOUNT, password: "incorrecta" }],
    ["a validation error", null, { email: "staff@example.com", password: "" }],
    ["Supabase down", { status: "unavailable", errorCode: "x" }, ACCOUNT],
  ])(
    "gives back the typed email after %s, never the password (F4-03)",
    async (_case, outcome, fields) => {
      const ctx = setup();
      ctx.authGateway.respondWith(outcome);

      const result = await ctx.signIn({ ...fields, email: `  ${fields.email ?? ""} ` });

      expect(result.values).toEqual({ email: fields.email });
      expect(JSON.stringify(result)).not.toContain(ACCOUNT.password);
    },
  );

  it("gives back no email when none was typed", async () => {
    const result = await setup().signIn({ password: "x" });

    expect(result.values).toEqual({});
  });

  it("returns no values on success", async () => {
    expect((await setup().signIn()).values).toBeUndefined();
  });

  it("logs the provider's code on a rejected login, never the email", async () => {
    const ctx = setup();
    ctx.authGateway.respondWith({
      status: "invalid_credentials",
      errorCode: "email_not_confirmed",
    });

    await ctx.signIn();

    expect(ctx.logs).toHaveLength(1);
    expect(JSON.parse(ctx.logs[0] ?? "{}")).toMatchObject({
      event: "auth.sign_in_rejected",
      errorCode: "email_not_confirmed",
    });
  });

  it("allows 5 attempts per IP every 15 minutes, then RATE_LIMITED without calling Supabase", async () => {
    const ctx = setup();
    const wrong = { ...ACCOUNT, password: "incorrecta" };

    for (let attempt = 0; attempt < rateLimits.loginByIp.limit; attempt++) {
      expect((await ctx.signIn(wrong)).ok).toBe(false);
    }
    const blocked = await ctx.signIn();

    expect(blocked).toEqual({
      ok: false,
      error: { code: "RATE_LIMITED", message: DEFAULT_ERROR_MESSAGES.RATE_LIMITED },
      values: { email: ACCOUNT.email },
    });
    expect(ctx.authGateway.signInCalls).toHaveLength(rateLimits.loginByIp.limit);

    ctx.clock.advance(15 * 60_000 + 1);
    expect((await ctx.signIn()).ok).toBe(true);
  });

  it("counts malformed attempts too: the rate limit runs before validation", async () => {
    const ctx = setup();

    for (let attempt = 0; attempt < rateLimits.loginByIp.limit; attempt++) {
      await ctx.signIn({ email: "", password: "" });
    }

    expect((await ctx.signIn()).ok).toBe(false);
    expect(ctx.authGateway.signInCalls).toHaveLength(0);
  });

  it("lets the attempt through when the rate limiter is down, and logs it (ADR-0013)", async () => {
    const ctx = setup();
    ctx.rateLimiter.setUnavailable(true);

    const result = await ctx.signIn();

    expect(result.ok).toBe(true);
    expect(events(ctx.logs)).toEqual(["rate_limit.unavailable", "auth.signed_in"]);
  });

  it("skips the per-IP rule without a client IP, and logs it", async () => {
    const ctx = setup();

    const result = await ctx.signIn(ACCOUNT, null);

    expect(result.ok).toBe(true);
    expect(events(ctx.logs)).toContain("rate_limit.no_client_ip");
  });

  it("maps Supabase's own rate limit to RATE_LIMITED", async () => {
    const ctx = setup();
    ctx.authGateway.respondWith({ status: "rate_limited" });

    const result = await ctx.signIn();

    expect(result.ok === false && result.error.code).toBe("RATE_LIMITED");
  });

  it("maps an unavailable Supabase to INTERNAL with a generic message", async () => {
    const ctx = setup();
    ctx.authGateway.respondWith({ status: "unavailable", errorCode: "AuthRetryableFetchError" });

    const result = await ctx.signIn();

    expect(result).toEqual({
      ok: false,
      error: { code: "INTERNAL", message: DEFAULT_ERROR_MESSAGES.INTERNAL },
      values: { email: ACCOUNT.email },
    });
    expect(JSON.parse(ctx.logs.at(-1) ?? "{}")).toMatchObject({
      level: "error",
      event: "auth.sign_in_unavailable",
      errorCode: "AuthRetryableFetchError",
    });
  });

  it("never writes the email, the password or the IP to the logs", async () => {
    const ctx = setup();
    ctx.rateLimiter.setUnavailable(true);
    await ctx.signIn();
    await ctx.signIn({ ...ACCOUNT, password: "incorrecta" });
    ctx.authGateway.respondWith({ status: "unavailable", errorCode: "status_500" });
    await ctx.signIn();

    const output = ctx.logs.join("\n");
    for (const value of SENSITIVE) expect(output).not.toContain(value);
  });
});

describe("signOutWith", () => {
  it("signs out and logs it", async () => {
    const ctx = setup();

    await signOutWith(ctx);

    expect(ctx.authGateway.signOutCalls).toBe(1);
    expect(events(ctx.logs)).toEqual(["auth.signed_out"]);
  });

  it("logs a provider failure without throwing", async () => {
    const ctx = setup();
    ctx.authGateway.failSignOut("AuthRetryableFetchError");

    await expect(signOutWith(ctx)).resolves.toBeUndefined();
    expect(JSON.parse(ctx.logs[0] ?? "{}")).toMatchObject({
      level: "error",
      event: "auth.sign_out_failed",
      errorCode: "AuthRetryableFetchError",
    });
  });
});
