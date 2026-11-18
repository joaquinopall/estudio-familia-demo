/**
 * Security headers for every route (NFR-SEC-04) and the base Content Security Policy
 * in report-only mode (NFR-SEC-05, Phase 1). Enforcing the CSP is task F5-01.
 *
 * Pure module: no `server-only` and no `@/` alias, because `next.config.ts` imports it.
 */

export type SecurityHeader = { key: string; value: string };

type Options = { isDev: boolean };

/** Cloudflare Turnstile (anti-bot widget, Phase 3): loads a script and renders an iframe. */
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

export const CSP_HEADER_NAME = "Content-Security-Policy-Report-Only";

export function buildContentSecurityPolicy({ isDev }: Options): string {
  const directives: Record<string, string[]> = {
    // Anything not listed below is only allowed from our own origin.
    "default-src": ["'self'"],
    // 'unsafe-inline': statically rendered pages carry Next's inline bootstrap scripts and
    // cannot use per-request nonces without giving up SSG (see F5-01).
    // 'unsafe-eval' only in dev: React uses eval for debugging; production does not.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      TURNSTILE_ORIGIN,
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Next and Tailwind may inject inline styles.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    // next/font self-hosts the fonts.
    "font-src": ["'self'"],
    // Same-origin fetches and Server Actions (Supabase is added in Phase 4 if the browser needs it).
    "connect-src": ["'self'"],
    "frame-src": [TURNSTILE_ORIGIN],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    // Not enforced while report-only: X-Frame-Options covers clickjacking meanwhile.
    "frame-ancestors": ["'none'"],
  };

  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

export function buildSecurityHeaders(options: Options): SecurityHeader[] {
  return [
    // 2 years, without `preload` (hard to revert and affects the whole domain).
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    { key: "X-Frame-Options", value: "DENY" },
    { key: CSP_HEADER_NAME, value: buildContentSecurityPolicy(options) },
  ];
}
