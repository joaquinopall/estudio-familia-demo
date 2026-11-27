import { describe, expect, it } from "vitest";

import {
  EnvValidationError,
  parseDirectUrl,
  parsePublicEnv,
  parseServerEnv,
  parseVercelEnv,
  parseVercelSystemEnv,
  publicEnvSchema,
  serverEnvSchema,
  validateEnv,
} from "@/lib/env.schema";

const validPublic = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fake",
};

/** Every server variable required since F3-05, with fictitious values. */
const validServer = {
  DATABASE_URL: "postgresql://user:pass@host:6543/postgres",
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Estudio Demo <no-reply@example.com>",
  FIRM_NOTIFICATION_EMAIL: "estudio@example.com",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "token",
  IP_HASH_SALT: "a".repeat(32),
  FIELD_ENCRYPTION_KEYS: "k1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
};

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
    expect(env.NEXT_PUBLIC_DEMO_MODE).toBe(true);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://project-ref.supabase.co");
  });

  it.each(["", "  "])("keeps demo mode on when the variable is empty (%j, ADR-0011)", (raw) => {
    const env = parsePublicEnv({ ...validPublic, NEXT_PUBLIC_DEMO_MODE: raw });

    expect(env.NEXT_PUBLIC_DEMO_MODE).toBe(true);
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

  it("requires the Turnstile site key (F3-05)", () => {
    const message = errorMessageOf(() =>
      parsePublicEnv({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }),
    );

    expect(message).toContain("NEXT_PUBLIC_TURNSTILE_SITE_KEY: es obligatoria");
  });

  it("requires the Supabase Auth variables (F4-01)", () => {
    const message = errorMessageOf(() =>
      parsePublicEnv({
        ...validPublic,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      }),
    );

    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL: es obligatoria");
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: es obligatoria");
  });

  it("rejects a Supabase URL that is not http(s)", () => {
    const message = errorMessageOf(() =>
      parsePublicEnv({ ...validPublic, NEXT_PUBLIC_SUPABASE_URL: "project-ref" }),
    );

    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL: debe ser una URL http(s) válida");
  });

  it("rejects an unexpected NEXT_PUBLIC_DEMO_MODE value", () => {
    const message = errorMessageOf(() =>
      parsePublicEnv({ ...validPublic, NEXT_PUBLIC_DEMO_MODE: "yes" }),
    );

    expect(message).toContain('NEXT_PUBLIC_DEMO_MODE: debe ser "true" o "false"');
  });
});

describe("parseServerEnv", () => {
  it("requires every variable the inquiry form uses (F3-05), naming each one", () => {
    const message = errorMessageOf(() => parseServerEnv({}));

    for (const key of Object.keys(validServer)) {
      expect(message).toContain(`${key}: es obligatoria`);
    }
  });

  it("keeps DIRECT_URL optional: only the Prisma CLI uses it", () => {
    expect(parseServerEnv(validServer).DIRECT_URL).toBeUndefined();
  });

  it("validates the format of each variable", () => {
    const message = errorMessageOf(() =>
      parseServerEnv({
        ...validServer,
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
      ...validServer,
      DIRECT_URL: "postgres://user:pass@host:5432/postgres",
    });

    expect(env.IP_HASH_SALT).toHaveLength(32);
  });

  it("validates FIELD_ENCRYPTION_KEYS without ever echoing the key (ADR-0017)", () => {
    const material = Buffer.alloc(16, 7).toString("base64"); // 16 bytes: too short
    const message = errorMessageOf(() =>
      parseServerEnv({ ...validServer, FIELD_ENCRYPTION_KEYS: `k1:${material}` }),
    );

    expect(message).toContain("FIELD_ENCRYPTION_KEYS");
    expect(message).toContain("32 bytes");
    expect(message).not.toContain(material);
  });
});

describe("parseDirectUrl (prisma.config.ts)", () => {
  it("does not require the app's other variables, so `prisma generate` runs anywhere", () => {
    expect(parseDirectUrl({})).toBeUndefined();
  });

  it("returns DIRECT_URL and validates its format", () => {
    expect(parseDirectUrl({ DIRECT_URL: "postgres://u:p@h:5432/db" })).toBe(
      "postgres://u:p@h:5432/db",
    );
    expect(() => parseDirectUrl({ DIRECT_URL: "http://nope" })).toThrow(EnvValidationError);
  });
});

describe("parseVercelEnv (next.config.ts, ADR-0016)", () => {
  it("is undefined outside Vercel (missing or empty)", () => {
    expect(parseVercelEnv({})).toBeUndefined();
    expect(parseVercelEnv({ VERCEL_ENV: "" })).toBeUndefined();
  });

  it("returns each value Vercel sets", () => {
    expect(parseVercelEnv({ VERCEL_ENV: "development" })).toBe("development");
    expect(parseVercelEnv({ VERCEL_ENV: "preview" })).toBe("preview");
    expect(parseVercelEnv({ VERCEL_ENV: "production" })).toBe("production");
  });

  it("rejects anything else, naming the variable", () => {
    expect(() => parseVercelEnv({ VERCEL_ENV: "staging" })).toThrow(/VERCEL_ENV/);
  });
});

describe("validateEnv", () => {
  it("reports public and server problems together", () => {
    const message = errorMessageOf(() => validateEnv({ IP_HASH_SALT: "short" }));

    expect(message).toContain("NEXT_PUBLIC_SITE_URL");
    expect(message).toContain("IP_HASH_SALT");
  });

  it("passes with a valid environment", () => {
    expect(() => validateEnv({ ...validPublic, ...validServer })).not.toThrow();
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

describe("SENTRY_DSN (F5-04, ADR-0018)", () => {
  it("is optional: without it errors stay in the logs", () => {
    expect(parseServerEnv(validServer).SENTRY_DSN).toBeUndefined();
  });

  it("accepts a Sentry DSN", () => {
    const dsn = "https://abc123@o4507.ingest.us.sentry.io/4508";
    expect(parseServerEnv({ ...validServer, SENTRY_DSN: dsn }).SENTRY_DSN).toBe(dsn);
  });

  it.each(["http://abc@sentry.io/1", "https://sentry.io/1", "https://abc@sentry.io/proyecto"])(
    "rejects %s, naming the variable",
    (dsn) => {
      expect(() => parseServerEnv({ ...validServer, SENTRY_DSN: dsn })).toThrow(/SENTRY_DSN/);
    },
  );
});

describe("parseVercelSystemEnv (F5-04)", () => {
  it("is empty outside Vercel", () => {
    expect(parseVercelSystemEnv({})).toEqual({});
  });

  it("reads the environment and the commit", () => {
    expect(
      parseVercelSystemEnv({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_SHA: "1bff3e5" }),
    ).toEqual({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_SHA: "1bff3e5" });
  });

  it("rejects a commit that is not a git SHA", () => {
    expect(() => parseVercelSystemEnv({ VERCEL_GIT_COMMIT_SHA: "main" })).toThrow(
      /VERCEL_GIT_COMMIT_SHA/,
    );
  });
});
