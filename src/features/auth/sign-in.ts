/**
 * Logic of the signIn and signOut Server Actions (SPEC §6.5, §8.2, §10.2, ADR-0014).
 * Dependencies come in as parameters so every branch is tested with fakes; actions.ts wires
 * the real ones and does the redirects.
 *
 * signIn order: rate limit per IP → validation → Supabase. The rate limit goes first so every
 * attempt counts, even malformed ones.
 */
import { rateLimits } from "@/config/rate-limits";
import { type ActionResult, fail, ok, validationFailure } from "@/lib/action-result";
import type { Logger } from "@/lib/logger";
import type { AuthGateway } from "@/lib/ports/auth-gateway";
import type { RateLimiter } from "@/lib/ports/rate-limiter";
import { hashIdentifier } from "@/lib/security/ip";

import { signInSchema } from "./schema";

/**
 * One message for every rejected login: wrong password, unknown email, unconfirmed email...
 * The login never reveals whether an account exists (SPEC §6.5).
 */
export const INVALID_CREDENTIALS_MESSAGE = "El email o la contraseña no son correctos.";

/** On success the action redirects, so the result carries no data. */
export type SignInResult = ActionResult<null>;
/** useActionState state: null before the first attempt. It never holds a success. */
export type SignInState = Extract<SignInResult, { ok: false }> | null;

export type SignInDeps = {
  rateLimiter: RateLimiter;
  authGateway: AuthGateway;
  logger: Logger;
  ipHashSalt: string;
};

export type SignInRequest = { formData: FormData; clientIp: string | null };

const fieldOf = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
};

export function createSignInHandler(deps: SignInDeps) {
  const { logger } = deps;

  /** True if this attempt must be rejected. A limiter outage lets it through (ADR-0013). */
  async function isRateLimited(clientIp: string | null): Promise<boolean> {
    if (!clientIp) {
      logger.warn("rate_limit.no_client_ip");
      return false;
    }
    const key = hashIdentifier(deps.ipHashSalt, "ip", clientIp);
    const result = await deps.rateLimiter.limit(rateLimits.loginByIp, key);
    if (result.status === "unavailable") {
      // Supabase's own protection still applies; leave a trace.
      logger.warn("rate_limit.unavailable", { errorCode: rateLimits.loginByIp.name });
      return false;
    }
    return result.status === "limited";
  }

  return async function signIn({ formData, clientIp }: SignInRequest): Promise<SignInResult> {
    if (await isRateLimited(clientIp)) {
      logger.info("auth.sign_in_rate_limited");
      return fail("RATE_LIMITED");
    }

    const parsed = signInSchema.safeParse({
      email: fieldOf(formData, "email"),
      password: fieldOf(formData, "password"),
    });
    // Shape errors only ("Ingresá tu contraseña"): they say nothing about any account.
    if (!parsed.success) return validationFailure(parsed.error);

    const outcome = await deps.authGateway.signInWithPassword(parsed.data);
    switch (outcome.status) {
      case "ok":
        logger.info("auth.signed_in");
        return ok(null);
      case "invalid_credentials":
        logger.info("auth.sign_in_rejected", { errorCode: outcome.errorCode });
        return fail("UNAUTHORIZED", INVALID_CREDENTIALS_MESSAGE);
      case "rate_limited":
        logger.warn("auth.sign_in_rate_limited_by_provider");
        return fail("RATE_LIMITED");
      case "unavailable":
        logger.error("auth.sign_in_unavailable", { errorCode: outcome.errorCode });
        return fail("INTERNAL");
    }
  };
}

/**
 * Ends this browser's session. With scope "local", Supabase deletes the session cookies before
 * calling its server, so a failure only means the refresh token may not have been revoked
 * there. It is logged and never blocks the person: the action still sends them to the login.
 */
export async function signOutWith(deps: Pick<SignInDeps, "authGateway" | "logger">) {
  const result = await deps.authGateway.signOut();
  if (result.ok) deps.logger.info("auth.signed_out");
  else deps.logger.error("auth.sign_out_failed", { errorCode: result.errorCode });
}
