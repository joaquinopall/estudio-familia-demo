/**
 * Port for staff sign-in and sign-out (SPEC §6.4, §6.5, ADR-0014). Adapter:
 * lib/supabase/auth-gateway.ts. Unlike the other ports, it is created per request, because it
 * reads and writes that request's session cookies.
 *
 * Like the other ports (ADR-0013), it never throws for provider failures: it returns a status.
 */

export type SignInCredentials = { email: string; password: string };

export type SignInOutcome =
  /** Signed in: the session cookies are set on the response. */
  | { status: "ok" }
  /**
   * Wrong email or password, unconfirmed email, banned user... Always shown to the person with
   * the same generic message, so the login never reveals whether an account exists (§6.5).
   * `errorCode` is the provider's code, for logs only.
   */
  | { status: "invalid_credentials"; errorCode: string }
  /** The provider's own brute-force protection answered "too many attempts". */
  | { status: "rate_limited" }
  /** The provider could not answer (network, timeout, 5xx). */
  | { status: "unavailable"; errorCode: string };

export type SignOutOutcome = { ok: true } | { ok: false; errorCode: string };

export interface AuthGateway {
  signInWithPassword(credentials: SignInCredentials): Promise<SignInOutcome>;
  /** Ends the session of this browser only, never the ones on other devices. */
  signOut(): Promise<SignOutOutcome>;
}
