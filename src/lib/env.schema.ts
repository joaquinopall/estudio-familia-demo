/**
 * Environment variable schemas (SPEC §9).
 *
 * Pure module: no `server-only` and no `@/` alias, because `next.config.ts` imports it
 * to validate the environment when Next loads (dev, build and start).
 * App code must not import this file directly: use `env.ts` (server) or `env.public.ts` (client).
 */
import { z } from "zod";

import { parseFieldEncryptionKeys } from "./security/field-keys";

type EnvSource = Record<string, string | undefined>;

/** Treats `KEY=` (empty string) the same as a missing variable. */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

const required = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema);

const httpUrl = () => z.url({ protocol: /^https?$/, error: "debe ser una URL http(s) válida" });
const postgresUrl = () =>
  z.url({ protocol: /^postgres(ql)?$/, error: "debe ser una URL de Postgres válida" });
const nonEmpty = () => z.string().min(1, { error: "no puede estar vacía" });

export const publicEnvSchema = z.object({
  // Required from Phase 1 (metadata base, sitemap, OG).
  NEXT_PUBLIC_SITE_URL: required(httpUrl()),
  // Demo banner and noindex (FR-15). Missing = true, so a forgotten variable never publishes
  // the fictitious firm as a real one (ADR-0011).
  NEXT_PUBLIC_DEMO_MODE: optional(
    z.stringbool({ truthy: ["true"], falsy: ["false"], error: 'debe ser "true" o "false"' }),
  ).transform((value) => value ?? true),
  // Required from F4-01 (Supabase Auth for the admin panel). Only the server uses them: there
  // is no browser client (ADR-0014), but they are public by nature (publishable key).
  NEXT_PUBLIC_SUPABASE_URL: required(httpUrl()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: required(nonEmpty()),
  // Required from F3-05 (Turnstile widget). Test key in dev, CI and Preview (ADR-0013).
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: required(nonEmpty()),
});

export const serverEnvSchema = z.object({
  // Required from F3-05: the inquiry form uses all of them.
  // Prisma at runtime (pooler).
  DATABASE_URL: required(postgresUrl()),
  // Prisma CLI only (migrations); not set in Vercel (ADR-0012).
  DIRECT_URL: optional(postgresUrl()),
  // Resend. EMAIL_FROM accepts "Name <email@domain>".
  RESEND_API_KEY: required(nonEmpty()),
  EMAIL_FROM: required(nonEmpty()),
  FIRM_NOTIFICATION_EMAIL: required(z.email({ error: "debe ser un email válido" })),
  // Turnstile verification.
  TURNSTILE_SECRET_KEY: required(nonEmpty()),
  // Upstash rate limit.
  UPSTASH_REDIS_REST_URL: required(httpUrl()),
  UPSTASH_REDIS_REST_TOKEN: required(nonEmpty()),
  // IP and email HMAC (lib/security/ip.ts).
  IP_HASH_SALT: required(z.string().min(32, { error: "debe tener al menos 32 caracteres" })),
  // AES-256-GCM of the inquiry message and the internal notes (F5-02, ADR-0017). Validated
  // here so a malformed key fails the build, not the first inquiry. Kept as the raw string:
  // the adapter parses it again (never logged).
  FIELD_ENCRYPTION_KEYS: required(
    nonEmpty().superRefine((value, ctx) => {
      const parsed = parseFieldEncryptionKeys(value);
      if (!parsed.ok) ctx.addIssue({ code: "custom", message: parsed.error });
    }),
  ),
  // Optional (F5-04, ADR-0018): without it nothing is sent to Sentry. A Sentry DSN:
  // https://<public key>@<host>/<project id>.
  SENTRY_DSN: optional(
    z.url({ protocol: /^https$/, error: "debe ser el DSN https de Sentry" }).refine(
      (value) => {
        const url = new URL(value);
        return url.username !== "" && /^\/\d+$/.test(url.pathname);
      },
      { error: "debe tener la forma https://<clave>@<host>/<número de proyecto>" },
    ),
  ),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvValidationError extends Error {
  override readonly name = "EnvValidationError";
}

/**
 * Builds a readable message that names each invalid variable and the rule it breaks.
 * It never includes the received values (they may be secrets).
 */
function formatIssues(error: z.ZodError, source: EnvSource): string {
  const lines = error.issues.map((issue) => {
    const key = String(issue.path[0] ?? "(desconocida)");
    const isMissing = emptyToUndefined(source[key]) === undefined;
    const reason = isMissing ? "es obligatoria y no está definida" : issue.message;
    return `  - ${key}: ${reason}`;
  });
  return [
    "Variables de entorno inválidas:",
    ...lines,
    "Revisá tu .env.local (ver .env.example) o las variables del entorno de deploy.",
  ].join("\n");
}

function parseWith<T extends z.ZodType>(schema: T, source: EnvSource): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(formatIssues(result.error, source));
  }
  return result.data;
}

export const parsePublicEnv = (source: EnvSource): PublicEnv => parseWith(publicEnvSchema, source);

export const parseServerEnv = (source: EnvSource): ServerEnv => parseWith(serverEnvSchema, source);

const directUrlSchema = serverEnvSchema.pick({ DIRECT_URL: true });

/**
 * Only DIRECT_URL, for prisma.config.ts: `prisma generate` runs on every `npm ci` (CI, Vercel,
 * a fresh clone) and must not require the credentials of the other services.
 */
export const parseDirectUrl = (source: EnvSource): string | undefined =>
  parseWith(directUrlSchema, source).DIRECT_URL;

/**
 * VERCEL_ENV is a system variable that Vercel sets on every build and function; it is not
 * part of .env.example. next.config.ts uses it to allow the Vercel Toolbar only in Preview
 * (ADR-0016). Missing (local, CI) means "not on Vercel".
 */
const vercelEnvSchema = z.object({
  VERCEL_ENV: optional(
    z.enum(["development", "preview", "production"], {
      error: 'debe ser "development", "preview" o "production"',
    }),
  ),
});

export type VercelEnv = z.infer<typeof vercelEnvSchema>["VERCEL_ENV"];

export const parseVercelEnv = (source: EnvSource): VercelEnv =>
  parseWith(vercelEnvSchema, source).VERCEL_ENV;

/**
 * Vercel's system variables the error reporter tags events with (F5-04): the environment and
 * the commit as the release. Missing locally and in CI.
 */
const vercelSystemSchema = vercelEnvSchema.extend({
  VERCEL_GIT_COMMIT_SHA: optional(
    z.string().regex(/^[0-9a-f]{7,40}$/, { error: "debe ser un SHA de git" }),
  ),
});

export type VercelSystemEnv = z.infer<typeof vercelSystemSchema>;

export const parseVercelSystemEnv = (source: EnvSource): VercelSystemEnv =>
  parseWith(vercelSystemSchema, source);

/** Validates public and server variables together and reports every problem at once. */
export function validateEnv(source: EnvSource): void {
  const errors: string[] = [];
  for (const parse of [parsePublicEnv, parseServerEnv]) {
    try {
      parse(source);
    } catch (error) {
      if (!(error instanceof EnvValidationError)) throw error;
      errors.push(error.message);
    }
  }
  if (errors.length > 0) {
    throw new EnvValidationError(errors.join("\n"));
  }
}
