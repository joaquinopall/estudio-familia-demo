// @vitest-environment node
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DATABASE_CA_RELATIVE_PATH,
  DatabaseTlsConfigError,
  assertNoSslParams,
  databaseCaPath,
  withVerifiedTlsForPrismaCli,
} from "@/lib/db-tls";

const URL_BASE = "postgresql://user:secret-password@db.invalid:5432/postgres";
const CA_PATH = join("/repo", "prisma", "certs", "supabase-ca.crt");

describe("databaseCaPath", () => {
  it("points to the Supabase CA inside the given root", () => {
    expect(databaseCaPath("/repo")).toBe(join("/repo", DATABASE_CA_RELATIVE_PATH));
    expect(DATABASE_CA_RELATIVE_PATH).toBe(join("prisma", "certs", "supabase-ca.crt"));
  });
});

describe("assertNoSslParams", () => {
  it.each([
    "sslmode=disable",
    "sslmode=require",
    "sslaccept=accept_invalid_certs",
    "uselibpqcompat=true",
  ])("rejects %s and names the variable without showing the URL", (params) => {
    const call = () => assertNoSslParams("DATABASE_URL", `${URL_BASE}?${params}`);

    expect(call).toThrow(DatabaseTlsConfigError);
    expect(call).toThrow(/^DATABASE_URL no debe tener parámetros ssl\*/);
    expect(call).not.toThrow(/secret-password/);
  });

  it("accepts URLs without SSL parameters", () => {
    expect(() => assertNoSslParams("DATABASE_URL", URL_BASE)).not.toThrow();
    expect(() => assertNoSslParams("DATABASE_URL", `${URL_BASE}?pgbouncer=true`)).not.toThrow();
  });
});

describe("withVerifiedTlsForPrismaCli", () => {
  it("requires TLS and verifies the certificate against the CA", () => {
    const params = new URL(withVerifiedTlsForPrismaCli(URL_BASE, CA_PATH)).searchParams;

    expect(params.get("sslmode")).toBe("require");
    expect(params.get("sslaccept")).toBe("strict");
    expect(params.get("sslcert")).toBe(CA_PATH);
  });

  it("keeps credentials, host and database", () => {
    const url = new URL(withVerifiedTlsForPrismaCli(URL_BASE, CA_PATH));

    expect(url.username).toBe("user");
    expect(url.password).toBe("secret-password");
    expect(url.host).toBe("db.invalid:5432");
    expect(url.pathname).toBe("/postgres");
  });

  it("refuses a DIRECT_URL that already sets SSL parameters", () => {
    expect(() =>
      withVerifiedTlsForPrismaCli(`${URL_BASE}?sslaccept=accept_invalid_certs`, CA_PATH),
    ).toThrow(/^DIRECT_URL no debe tener parámetros ssl\*/);
  });
});
