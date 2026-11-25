/**
 * Options of the Supabase Auth session cookies (NFR-SEC-07, ADR-0014).
 *
 * @supabase/ssr defaults to httpOnly: false so a browser client can read the session. This app
 * has no browser client (the login is a Server Action), so the cookies are httpOnly: JavaScript
 * in the page, including an injected script, cannot read the tokens.
 *
 * Secure follows the site URL: on Vercel (https) it is always on; on http://localhost it is
 * off so the session works in development.
 */
import type { CookieOptionsWithName } from "@supabase/ssr";

export function buildAuthCookieOptions(siteUrl: string): CookieOptionsWithName {
  return {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: new URL(siteUrl).protocol === "https:",
  };
}
