import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { publicEnvSchema, serverEnvSchema, validateEnv } from "@/lib/env.schema";

function readEnvExample(): Record<string, string> {
  const content = readFileSync(join(process.cwd(), ".env.example"), "utf8");
  const entries: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    entries[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return entries;
}

describe(".env.example", () => {
  const example = readEnvExample();

  it("declares exactly the variables defined in the env schemas", () => {
    const schemaKeys = [
      ...Object.keys(publicEnvSchema.shape),
      ...Object.keys(serverEnvSchema.shape),
    ].sort();

    expect(Object.keys(example).sort()).toEqual(schemaKeys);
  });

  it("is valid once the empty credentials are filled (F3-05 and F4-01 require them)", () => {
    const filled: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fake",
      DATABASE_URL: "postgresql://user:pass@host:6543/postgres",
      DIRECT_URL: "postgresql://user:pass@host:5432/postgres",
      RESEND_API_KEY: "re_fake",
      EMAIL_FROM: "Estudio <onboarding@resend.dev>",
      FIRM_NOTIFICATION_EMAIL: "estudio@example.com",
      UPSTASH_REDIS_REST_URL: "https://fake.upstash.invalid",
      UPSTASH_REDIS_REST_TOKEN: "fake",
      IP_HASH_SALT: "x".repeat(32),
      FIELD_ENCRYPTION_KEYS: "k1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    };
    const withCredentials = Object.fromEntries(
      Object.entries(example).map(([key, value]) => [key, value || filled[key] || ""]),
    );

    expect(() => validateEnv(withCredentials)).not.toThrow();
  });

  it("leaves every secret empty: it is committed", () => {
    for (const key of [
      "DATABASE_URL",
      "RESEND_API_KEY",
      "UPSTASH_REDIS_REST_TOKEN",
      "IP_HASH_SALT",
      "FIELD_ENCRYPTION_KEYS",
      "SENTRY_DSN",
    ]) {
      expect(example[key]).toBe("");
    }
  });
});
