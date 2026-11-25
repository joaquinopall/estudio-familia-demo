/**
 * Supabase client for Server Components and Server Actions (SPEC §6.4, ADR-0014). It reads and
 * writes the session through Next's cookies(). Create one per request: never share it.
 *
 * Only Supabase Auth goes through here. The database is accessed with Prisma (ADR-0002), and
 * RLS without policies keeps this client (publishable key) away from the tables.
 */
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

import { buildAuthCookieOptions } from "./cookie-options";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: buildAuthCookieOptions(env.NEXT_PUBLIC_SITE_URL),
      cookies: {
        getAll: () => cookieStore.getAll(),
        // The cache headers Supabase passes as the second argument are not needed here: Server
        // Action responses (POST) are never cached. The proxy applies them on /admin pages.
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only. The proxy already
            // refreshed the session for this request, so there is nothing to persist.
          }
        },
      },
    },
  );
}
