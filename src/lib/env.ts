/**
 * Validated environment for server code (SPEC §9). The only allowed entry point to env vars
 * on the server. Client Components must import `env.public.ts` instead.
 */
import "server-only";

import { parseServerEnv } from "./env.schema";
import { publicEnv } from "./env.public";

export const env = {
  ...publicEnv,
  ...parseServerEnv(process.env),
} as const;

export type Env = typeof env;
