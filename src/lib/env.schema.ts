/**
 * Environment variable schemas (SPEC §9).
 *
 * Pure module: no `server-only` and no `@/` alias, because `next.config.ts` imports it
 * to validate the environment when Next loads (dev, build and start).
 * App code must not import this file directly: use `env.ts` (server) or `env.public.ts` (client).
 */
import { z } from "zod";

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
