// @vitest-environment node
import {
  AuthApiError,
  type AuthError,
  AuthRetryableFetchError,
  AuthUnknownError,
} from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { type SupabaseAuthClient, createSupabaseAuthGateway } from "@/lib/supabase/auth-gateway";

const CREDENTIALS = { email: "staff@example.com", password: "una-clave-larga-y-segura" };

type SignInAnswer = Awaited<ReturnType<SupabaseAuthClient["signInWithPassword"]>>;
type SignOutAnswer = Awaited<ReturnType<SupabaseAuthClient["signOut"]>>;

const NO_USER: SignInAnswer = { data: { user: null }, error: null };

/** Each answer is returned as is, or thrown when it is an Error. */
function clientAnswering(
  signIn: SignInAnswer | Error,
  signOut: SignOutAnswer | Error = { error: null },
  getUser: SignInAnswer | Error = NO_USER,
) {
  const client: SupabaseAuthClient = {
    signInWithPassword: vi.fn(async () => {
      if (signIn instanceof Error) throw signIn;
      return signIn;
    }),
    getUser: vi.fn(async () => {
      if (getUser instanceof Error) throw getUser;
      return getUser;
    }),
    signOut: vi.fn(async () => {
      if (signOut instanceof Error) throw signOut;
      return signOut;
    }),
  };
  return { client, gateway: createSupabaseAuthGateway(client) };
}

const rejected = (error: AuthError) => ({ data: { user: null }, error });

describe("Supabase AuthGateway: signInWithPassword", () => {
  it("returns ok when Supabase opens a session", async () => {
    const { gateway, client } = clientAnswering({ data: { user: { id: "u-1" } }, error: null });

    expect(await gateway.signInWithPassword(CREDENTIALS)).toEqual({ status: "ok" });
    expect(client.signInWithPassword).toHaveBeenCalledWith(CREDENTIALS);
  });

  it.each([
    ["invalid_credentials", 400],
    ["email_not_confirmed", 400],
    ["user_banned", 400],
  ])("maps %s to invalid_credentials", async (code, status) => {
    const { gateway } = clientAnswering(rejected(new AuthApiError("msg", status, code)));

    expect(await gateway.signInWithPassword(CREDENTIALS)).toEqual({
      status: "invalid_credentials",
      errorCode: code,
    });
  });

  it("maps any other 400 to invalid_credentials too", async () => {
    const { gateway } = clientAnswering(rejected(new AuthApiError("msg", 400, undefined)));

    expect(await gateway.signInWithPassword(CREDENTIALS)).toEqual({
      status: "invalid_credentials",
      errorCode: "status_400",
    });
  });

  it.each([
    new AuthApiError("Too many", 429, "over_request_rate_limit"),
    new AuthApiError("Too many", 429, undefined),
  ])("maps Supabase's rate limit to rate_limited", async (error) => {
    const { gateway } = clientAnswering(rejected(error));

    expect(await gateway.signInWithPassword(CREDENTIALS)).toEqual({ status: "rate_limited" });
  });

  it.each<[string, AuthError, string]>([
    [
      "a network failure",
      new AuthRetryableFetchError("fetch failed", 0),
      "AuthRetryableFetchError",
    ],
    ["a 500", new AuthApiError("boom", 500, "unexpected_failure"), "unexpected_failure"],
    ["an unknown error", new AuthUnknownError("odd", new Error("x")), "AuthUnknownError"],
  ])("maps %s to unavailable", async (_case, error, errorCode) => {
    const { gateway } = clientAnswering(rejected(error));

    expect(await gateway.signInWithPassword(CREDENTIALS)).toEqual({
      status: "unavailable",
      errorCode,
    });
  });

  it("returns unavailable instead of throwing when the client throws", async () => {
    const { gateway } = clientAnswering(new TypeError("fetch failed"));

    expect(await gateway.signInWithPassword(CREDENTIALS)).toEqual({
      status: "unavailable",
      errorCode: "TypeError",
    });
  });

  it("returns unavailable if Supabase answers without a user", async () => {
    const { gateway } = clientAnswering({ data: { user: null }, error: null });

    expect(await gateway.signInWithPassword(CREDENTIALS)).toEqual({
      status: "unavailable",
      errorCode: "no_user",
    });
  });

  it("never returns the provider's message (it may contain the email)", async () => {
    const message = `User ${CREDENTIALS.email} not confirmed`;
    const { gateway } = clientAnswering(
      rejected(new AuthApiError(message, 400, "email_not_confirmed")),
    );

    expect(JSON.stringify(await gateway.signInWithPassword(CREDENTIALS))).not.toContain("staff");
  });
});

describe("Supabase AuthGateway: getVerifiedUser", () => {
  const withUser = (answer: SignInAnswer | Error) =>
    clientAnswering(NO_USER, { error: null }, answer);

  it("returns the user id confirmed by the Auth server", async () => {
    const { gateway, client } = withUser({ data: { user: { id: "u-1" } }, error: null });

    expect(await gateway.getVerifiedUser()).toEqual({ status: "ok", userId: "u-1" });
    expect(client.getUser).toHaveBeenCalledTimes(1);
  });

  it.each<[string, SignInAnswer]>([
    ["no session", rejected(new AuthApiError("Auth session missing!", 400, undefined))],
    ["an expired or revoked session", rejected(new AuthApiError("bad", 403, "session_not_found"))],
    ["a deleted user", rejected(new AuthApiError("gone", 404, "user_not_found"))],
    ["an answer without a user", NO_USER],
  ])("returns none for %s", async (_case, answer) => {
    expect(await withUser(answer).gateway.getVerifiedUser()).toEqual({ status: "none" });
  });

  it.each<[string, SignInAnswer | Error, string]>([
    [
      "a network failure",
      rejected(new AuthRetryableFetchError("fetch failed", 0)),
      "AuthRetryableFetchError",
    ],
    ["a 5xx", rejected(new AuthApiError("boom", 503, "unexpected_failure")), "unexpected_failure"],
    ["a thrown error", new TypeError("fetch failed"), "TypeError"],
  ])("returns unavailable for %s, so callers fail closed", async (_case, answer, errorCode) => {
    expect(await withUser(answer).gateway.getVerifiedUser()).toEqual({
      status: "unavailable",
      errorCode,
    });
  });
});

describe("Supabase AuthGateway: signOut", () => {
  it("signs out with the local scope (this browser only)", async () => {
    const { gateway, client } = clientAnswering({ data: { user: null }, error: null });

    expect(await gateway.signOut()).toEqual({ ok: true });
    expect(client.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("reports a Supabase error with its code", async () => {
    const { gateway } = clientAnswering(
      { data: { user: null }, error: null },
      { error: new AuthApiError("boom", 500, "unexpected_failure") },
    );

    expect(await gateway.signOut()).toEqual({ ok: false, errorCode: "unexpected_failure" });
  });

  it("reports a thrown error without throwing", async () => {
    const { gateway } = clientAnswering(
      { data: { user: null }, error: null },
      new TypeError("fetch failed"),
    );

    expect(await gateway.signOut()).toEqual({ ok: false, errorCode: "TypeError" });
  });
});
