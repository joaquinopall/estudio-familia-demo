"use server";

/**
 * Server Actions of the staff login (SPEC §6.5). Thin: they read the request, wire the real
 * dependencies, delegate to sign-in.ts and redirect. redirect() throws on purpose, so it is
 * always called outside any try/catch.
 *
 * CSRF (§10.2): Next checks the Origin of every Server Action, and the cookies are SameSite=Lax.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getRateLimiter } from "@/lib/adapters";
import { adminPaths } from "@/lib/admin-paths";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/security/ip";
import { createSupabaseAuthGateway } from "@/lib/supabase/auth-gateway";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { type SignInState, createSignInHandler, signOutWith } from "./sign-in";

async function createAuthGateway() {
  const supabase = await createSupabaseServerClient();
  return createSupabaseAuthGateway(supabase.auth);
}

/**
 * Login form action, for useActionState(signIn, null) (F4-03). Success goes to the validated
 * `next` (the page that asked for the login, F4-06) or to /admin.
 */
export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const clientIp = getClientIp(await headers());
  const result = await createSignInHandler({
    rateLimiter: getRateLimiter(),
    authGateway: await createAuthGateway(),
    logger,
    ipHashSalt: env.IP_HASH_SALT,
  })({ formData, clientIp });

  if (result.ok) redirect(result.data.redirectTo);
  return result;
}

/** Ends this browser's session and goes to the login, even if Supabase did not answer. */
export async function signOut(): Promise<void> {
  await signOutWith({ authGateway: await createAuthGateway(), logger });
  redirect(adminPaths.login);
}
