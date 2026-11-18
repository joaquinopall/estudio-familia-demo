/**
 * Public environment variables (NEXT_PUBLIC_*). Safe to import from Client Components.
 *
 * Each variable is referenced explicitly (`process.env.NEXT_PUBLIC_X`) so Next can inline
 * its value into the browser bundle; dynamic access like `process.env[key]` is not inlined.
 */
import { parsePublicEnv } from "./env.schema";

export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});
