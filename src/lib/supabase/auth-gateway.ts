/**
 * AuthGateway adapter for Supabase Auth (ADR-0014). Translates Supabase's errors into the
 * port's statuses; never throws and never returns the provider's message (it may contain the
 * email).
 */
import { type AuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";

import type {
  AuthGateway,
  SignInCredentials,
  SignInOutcome,
  SignOutOutcome,
} from "@/lib/ports/auth-gateway";

/**
 * The part of `supabase.auth` this adapter uses. Supabase's client satisfies it; tests pass
 * a small fake.
 */
export type SupabaseAuthClient = {
  signInWithPassword(credentials: SignInCredentials): Promise<{
    data: { user: { id: string } | null };
    error: AuthError | null;
  }>;
  signOut(options: { scope: "local" }): Promise<{ error: AuthError | null }>;
};

/** Codes that mean "these credentials do not open a session", without saying why. */
const REJECTED_CODES = new Set([
  "invalid_credentials",
  "email_not_confirmed",
  "user_banned",
  "user_not_found",
]);

function errorCodeOf(error: AuthError): string {
  return error.code ?? (error.status ? `status_${error.status}` : error.name);
}

function mapSignInError(error: AuthError): SignInOutcome {
  if (isAuthRetryableFetchError(error)) {
    return { status: "unavailable", errorCode: errorCodeOf(error) };
  }
  if (error.code === "over_request_rate_limit" || error.status === 429) {
    return { status: "rate_limited" };
  }
  if ((error.code && REJECTED_CODES.has(error.code)) || error.status === 400) {
    return { status: "invalid_credentials", errorCode: errorCodeOf(error) };
  }
  return { status: "unavailable", errorCode: errorCodeOf(error) };
}

function nameOf(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

export function createSupabaseAuthGateway(auth: SupabaseAuthClient): AuthGateway {
  return {
    async signInWithPassword(credentials) {
      try {
        const { data, error } = await auth.signInWithPassword(credentials);
        if (error) return mapSignInError(error);
        if (!data.user) return { status: "unavailable", errorCode: "no_user" };
        return { status: "ok" };
      } catch (error) {
        return { status: "unavailable", errorCode: nameOf(error) };
      }
    },

    async signOut(): Promise<SignOutOutcome> {
      try {
        // "local": only this browser. The default ("global") would also end the sessions of
        // the same staff member on other devices.
        const { error } = await auth.signOut({ scope: "local" });
        return error ? { ok: false, errorCode: errorCodeOf(error) } : { ok: true };
      } catch (error) {
        return { ok: false, errorCode: nameOf(error) };
      }
    },
  };
}
