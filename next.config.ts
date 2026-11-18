import type { NextConfig } from "next";

import { validateEnv } from "./src/lib/env.schema";

// Fails `next dev`, `next build` and `next start` early if a required env var is missing
// or malformed (SPEC §9). Next has already loaded the .env* files at this point.
validateEnv(process.env);

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
