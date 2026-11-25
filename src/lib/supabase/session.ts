/**
 * Session refresh and first barrier of the admin panel, run by src/proxy.ts (SPEC §6.4 step 1,
 * ADR-0014). It is optimistic: authorization is decided by requireStaff() (F4-02) in every page
 * and action, never only here (NFR-SEC-02).
 *
 * It only uses public values (publicEnv), so it needs no `server-only` guard.
 */
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { adminPaths, isAdminPath } from "@/lib/admin-paths";
import { publicEnv } from "@/lib/env.public";
import { type Logger, logger as defaultLogger } from "@/lib/logger";

import { buildAuthCookieOptions } from "./cookie-options";

/** Headers Supabase sends with refreshed cookies so no CDN caches one person's session. */
const CACHE_HEADERS = ["cache-control", "expires", "pragma"] as const;

/** Where to send the request, or null to let it through. Pure, so it is tested alone. */
export function resolveAdminRedirect(pathname: string, hasSession: boolean): string | null {
  if (hasSession || !isAdminPath(pathname)) return null;
  // The login page itself is always reachable, or the redirect would loop.
  if (pathname === adminPaths.login) return null;
  return adminPaths.login;
}

export type SessionConfig = {
  supabaseUrl: string;
  supabaseKey: string;
  siteUrl: string;
  logger: Logger;
};

const defaultConfig = (): SessionConfig => ({
  supabaseUrl: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
  logger: defaultLogger,
});

/** A redirect that keeps the refreshed cookies and the no-cache headers of `from`. */
function redirectKeepingSession(request: NextRequest, from: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  for (const header of CACHE_HEADERS) {
    const value = from.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}

export async function updateSession(
  request: NextRequest,
  config: SessionConfig = defaultConfig(),
): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.supabaseUrl, config.supabaseKey, {
    cookieOptions: buildAuthCookieOptions(config.siteUrl),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        // The request copy lets Server Components of this same request see the new session.
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Nothing between creating the client and getClaims() (Supabase's guidance): getClaims()
  // verifies the JWT and refreshes it when it is about to expire.
  let hasSession = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    hasSession = !error && typeof data?.claims.sub === "string";
  } catch (error) {
    // Fail closed: without a verified session, /admin goes to the login.
    config.logger.warn("auth.session_check_failed", { error });
  }

  const target = resolveAdminRedirect(request.nextUrl.pathname, hasSession);
  return target ? redirectKeepingSession(request, response, target) : response;
}
