// @vitest-environment node
import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

// Records the pool config each adapter receives, keeping the real adapter.
const adapterConfigs = vi.hoisted(() => [] as unknown[]);
vi.mock("@prisma/adapter-pg", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@prisma/adapter-pg")>();
  class RecordingPrismaPg extends actual.PrismaPg {
    constructor(...args: ConstructorParameters<typeof actual.PrismaPg>) {
      super(...args);
      adapterConfigs.push(args[0]);
    }
  }
  return { ...actual, PrismaPg: RecordingPrismaPg };
});

// Fictitious URL: creating the client never opens a connection, so nothing is reached.
const FAKE_DATABASE_URL = "postgresql://user:secret-password@db.invalid:6543/postgres";
const FAKE_CA = "-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----\n";

const globalForDb = globalThis as typeof globalThis & { __prismaClient?: unknown };

describe("db (Prisma client singleton)", () => {
  afterEach(() => {
    delete globalForDb.__prismaClient;
    adapterConfigs.length = 0;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws a clear error when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDb, DatabaseConfigError } = await import("@/lib/db");

    expect(() => getDb()).toThrow(DatabaseConfigError);
    expect(() => getDb()).toThrow(/DATABASE_URL no está definida/);
  });

  it("creates the client lazily and reuses the same instance", async () => {
    vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
    const { getDb } = await import("@/lib/db");

    expect(globalForDb.__prismaClient).toBeUndefined();
    const first = getDb();
    expect(getDb()).toBe(first);
  });

  it("reuses the cached client across module reloads (dev hot reload)", async () => {
    vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
    const first = (await import("@/lib/db")).getDb();

    vi.resetModules();
    const second = (await import("@/lib/db")).getDb();

    expect(second).toBe(first);
  });

  it("exposes a delegate for every model of the schema", async () => {
    const { createDb } = await import("@/lib/db");
    const db = createDb(FAKE_DATABASE_URL, FAKE_CA);

    expect(db.inquiry).toBeDefined();
    expect(db.inquiryEvent).toBeDefined();
    expect(db.staffMember).toBeDefined();
  });

  it("connects with TLS verified against the given CA and a small pool", async () => {
    const { createDb, POOL_MAX_CONNECTIONS } = await import("@/lib/db");
    createDb(FAKE_DATABASE_URL, FAKE_CA);

    expect(adapterConfigs).toEqual([
      expect.objectContaining({
        connectionString: FAKE_DATABASE_URL,
        max: POOL_MAX_CONNECTIONS,
        ssl: { ca: FAKE_CA, rejectUnauthorized: true },
      }),
    ]);
  });

  it("uses the Supabase CA from the repository by default", async () => {
    const { createDb, DATABASE_CA_PATH } = await import("@/lib/db");
    createDb(FAKE_DATABASE_URL);

    expect(adapterConfigs[0]).toMatchObject({
      ssl: { ca: readFileSync(DATABASE_CA_PATH, "utf8") },
    });
  });

  it.each(["sslmode=require", "sslmode=disable", "uselibpqcompat=true&sslmode=require"])(
    "rejects a DATABASE_URL with SSL parameters (%s), which would override the verified TLS",
    async (params) => {
      const { createDb } = await import("@/lib/db");
      const { DatabaseTlsConfigError } = await import("@/lib/db-tls");

      expect(() => createDb(`${FAKE_DATABASE_URL}?${params}`, FAKE_CA)).toThrow(
        DatabaseTlsConfigError,
      );
    },
  );

  it("accepts non-SSL parameters such as pgbouncer=true", async () => {
    const { createDb } = await import("@/lib/db");

    expect(() => createDb(`${FAKE_DATABASE_URL}?pgbouncer=true`, FAKE_CA)).not.toThrow();
  });
});

describe("Supabase CA certificate (prisma/certs/supabase-ca.crt)", () => {
  it("is a PEM certificate and never a private key", async () => {
    const { DATABASE_CA_PATH } = await import("@/lib/db");
    const pem = readFileSync(DATABASE_CA_PATH, "utf8");

    expect(pem).toMatch(/^-----BEGIN CERTIFICATE-----/m);
    expect(pem).toMatch(/-----END CERTIFICATE-----/);
    expect(pem).not.toMatch(/PRIVATE KEY/);
  });
});
