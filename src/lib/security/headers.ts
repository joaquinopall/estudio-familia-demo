/**
 * Security headers for every route (NFR-SEC-04) and the enforced Content Security Policy
 * (NFR-SEC-05, F5-01, ADR-0016).
 *
 * Pure module: no `server-only` and no `@/` alias, because `next.config.ts` imports it.
 */

export type SecurityHeader = { key: string; value: string };

type Options = {
  isDev: boolean;
  /** Vercel Toolbar (comments on Preview deployments). Only in Preview, never in production. */
  vercelToolbar: boolean;
};

/** Cloudflare Turnstile (anti-bot widget): loads a script and renders an iframe. */
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/**
 * Origins the Vercel Toolbar needs, as listed by Vercel
 * (https://vercel.com/docs/vercel-toolbar/managing-toolbar).
 */
const VERCEL_TOOLBAR = {
  script: ["https://vercel.live"],
  style: ["https://vercel.live"],
  img: ["https://vercel.live", "https://vercel.com"],
  font: ["https://vercel.live", "https://assets.vercel.com"],
  connect: ["https://vercel.live", "wss://ws-us3.pusher.com"],
  frame: ["https://vercel.live"],
} as const;

export const CSP_HEADER_NAME = "Content-Security-Policy";

export function buildContentSecurityPolicy({ isDev, vercelToolbar }: Options): string {
  const toolbar = (sources: readonly string[]) => (vercelToolbar ? sources : []);

  const directives: Record<string, string[]> = {
    // Anything not listed below is only allowed from our own origin.
    "default-src": ["'self'"],
    // 'unsafe-inline': statically rendered pages (Cache Components) carry Next's inline
    // bootstrap and RSC payload scripts; nonces would make every page dynamic and Next's
    // SRI does not hash inline scripts (ADR-0016).
    // 'unsafe-eval' only in dev: React uses eval for debugging; production does not.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      TURNSTILE_ORIGIN,
      ...(isDev ? ["'unsafe-eval'"] : []),
      ...toolbar(VERCEL_TOOLBAR.script),
    ],
    // Next and Tailwind may inject inline styles.
    "style-src": ["'self'", "'unsafe-inline'", ...toolbar(VERCEL_TOOLBAR.style)],
    "img-src": ["'self'", "data:", "blob:", ...toolbar(VERCEL_TOOLBAR.img)],
    // next/font self-hosts the fonts.
    "font-src": ["'self'", ...toolbar(VERCEL_TOOLBAR.font)],
    // Same-origin fetches and Server Actions. Supabase is not here: the browser never talks
    // to it, every Auth call goes through the server (ADR-0014).
    "connect-src": ["'self'", ...toolbar(VERCEL_TOOLBAR.connect)],
    "frame-src": [TURNSTILE_ORIGIN, ...toolbar(VERCEL_TOOLBAR.frame)],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    // Clickjacking; X-Frame-Options stays for browsers without CSP level 2.
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
