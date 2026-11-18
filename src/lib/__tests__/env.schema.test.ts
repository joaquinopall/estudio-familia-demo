import { describe, expect, it } from "vitest";

import {
  EnvValidationError,
  parsePublicEnv,
  parseServerEnv,
  publicEnvSchema,
  serverEnvSchema,
  validateEnv,
} from "@/lib/env.schema";

const validPublic = { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" };

function errorMessageOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(EnvValidationError);
    return (error as EnvValidationError).message;
  }
  throw new Error("expected function to throw");
}

describe("parsePublicEnv", () => {
  it("accepts the minimal valid environment and applies defaults", () => {
    const env = parsePublicEnv(validPublic);

    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(env.NEXT_PUBLIC_DEMO_MODE).toBe(false);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
  });

  it("fails naming NEXT_PUBLIC_SITE_URL when it is missing", () => {
    const message = errorMessageOf(() => parsePublicEnv({}));

    expect(message).toContain("NEXT_PUBLIC_SITE_URL: es obligatoria y no está definida");
  });

  it("treats an empty string as missing", () => {
    const message = errorMessageOf(() => parsePublicEnv({ NEXT_PUBLIC_SITE_URL: "  " }));

    expect(message).toContain("NEXT_PUBLIC_SITE_URL: es obligatoria");
  });

  it("rejects an invalid URL without echoing the received value", () => {
    const value = "secret-looking-value-123";
    const message = errorMessageOf(() => parsePublicEnv({ NEXT_PUBLIC_SITE_URL: value }));

    expect(message).toContain("NEXT_PUBLIC_SITE_URL: debe ser una URL http(s) válida");
    expect(message).not.toContain(value);
  });

  it("rejects non-http protocols", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SITE_URL: "ftp://example.com" })).toThrow(
      EnvValidationError,
    );
  });

  it.each([
    ["true", true],
    ["false", false],
  ])("parses NEXT_PUBLIC_DEMO_MODE=%s as %s", (raw, expected) => {
    const env = parsePublicEnv({ ...validPublic, NEXT_PUBLIC_DEMO_MODE: raw });

    expect(env.NEXT_PUBLIC_DEMO_MODE).toBe(expected);
  });

  it("rejects an unexpected NEXT_PUBLIC_DEMO_MODE value", () => {
    const message = errorMessageOf(() =>
      parsePublicEnv({ ...validPublic, NEXT_PUBLIC_DEMO_MODE: "yes" }),
    );

    expect(message).toContain('NEXT_PUBLIC_DEMO_MODE: debe ser "true" o "false"');
  });
});

describe("parseServerEnv", () => {
  it("accepts an empty environment while later-phase variables are optional", () => {
    expect(parseServerEnv({})).toEqual({});
  });

  it("validates the format of optional variables when present", () => {
    const message = errorMessageOf(() =>
      parseServerEnv({
        IP_HASH_SALT: "too-short",
        DATABASE_URL: "http://not-postgres",
        FIRM_NOTIFICATION_EMAIL: "not-an-email",
      }),
    );

    expect(message).toContain("IP_HASH_SALT: debe tener al menos 32 caracteres");
    expect(message).toContain("DATABASE_URL: debe ser una URL de Postgres válida");
    expect(message).toContain("FIRM_NOTIFICATION_EMAIL: debe ser un email válido");
    expect(message).not.toContain("too-short");
  });

  it("accepts valid values for every variable", () => {
    const env = parseServerEnv({
      DATABASE_URL: "postgresql://user:pass@host:6543/postgres",
      DIRECT_URL: "postgres://user:pass@host:5432/postgres",
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "Estudio Demo <no-reply@example.com>",
      FIRM_NOTIFICATION_EMAIL: "estudio@example.com",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
      IP_HASH_SALT: "a".repeat(32),
    });

    expect(env.IP_HASH_SALT).toHaveLength(32);
  });
});

describe("validateEnv", () => {
  it("reports public and server problems together", () => {
    const message = errorMessageOf(() => validateEnv({ IP_HASH_SALT: "short" }));

    expect(message).toContain("NEXT_PUBLIC_SITE_URL");
    expect(message).toContain("IP_HASH_SALT");
  });

  it("passes with a valid environment", () => {
    expect(() => validateEnv(validPublic)).not.toThrow();
  });
});

describe("public/server split", () => {
  it("only exposes NEXT_PUBLIC_ variables in the public schema", () => {
    const keys = Object.keys(publicEnvSchema.shape);

    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((key) => key.startsWith("NEXT_PUBLIC_"))).toBe(true);
  });

  it("never declares NEXT_PUBLIC_ variables in the server schema", () => {
    const keys = Object.keys(serverEnvSchema.shape);

    expect(keys.some((key) => key.startsWith("NEXT_PUBLIC_"))).toBe(false);
  });
});
