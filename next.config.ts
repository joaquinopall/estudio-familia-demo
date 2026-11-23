import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

import { validateEnv } from "./src/lib/env.schema";
import { buildSecurityHeaders } from "./src/lib/security/headers";

// Fails `next dev`, `next build` and `next start` early if a required env var is missing
// or malformed (SPEC §9). Next has already loaded the .env* files at this point.
validateEnv(process.env);

export default function config(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    cacheComponents: true,
    partialPrefetching: true,
    // Do not advertise the framework (X-Powered-By: Next.js).
    poweredByHeader: false,
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
    // The icon is generated from site.config.ts (src/app/icon.tsx), but browsers and crawlers
    // still request /favicon.ico without reading the <head>.
    async rewrites() {
      return [{ source: "/favicon.ico", destination: "/icon" }];
    },
    // Security headers for every route (NFR-SEC-04, NFR-SEC-05).
    async headers() {
      return [{ source: "/(.*)", headers: buildSecurityHeaders({ isDev }) }];
    },
  };
}
