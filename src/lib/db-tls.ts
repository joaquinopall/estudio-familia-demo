/**
 * TLS settings for the database connections (ADR-0012). Pure module: prisma.config.ts imports
 * it, so no `server-only` and no `@/` alias.
 *
 * Both connections verify the server certificate against Supabase's root CA, which is public
 * and lives in the repository. The URLs in .env* must not carry SSL parameters: the code sets
 * them, so nobody can weaken them by accident.
 */
import { join } from "node:path";

/** Path from the project root to Supabase's root CA. For another provider, replace the file. */
export const DATABASE_CA_RELATIVE_PATH = join("prisma", "certs", "supabase-ca.crt");

export const databaseCaPath = (root: string = process.cwd()): string =>
  join(root, DATABASE_CA_RELATIVE_PATH);

export class DatabaseTlsConfigError extends Error {
  override readonly name = "DatabaseTlsConfigError";
}

/** Fails if the URL sets SSL parameters, which would override the verified TLS. */
export function assertNoSslParams(variable: string, connectionString: string): void {
  const keys = [...new URL(connectionString).searchParams.keys()];
  if (keys.some((key) => key.startsWith("ssl") || key === "uselibpqcompat")) {
    throw new DatabaseTlsConfigError(
      `${variable} no debe tener parámetros ssl*: el cifrado se configura en src/lib/db-tls.ts.`,
    );
  }
}

/**
 * URL for the Prisma CLI (migrations). Its engine defaults to `sslmode=prefer`, which encrypts
 * without checking the certificate; `sslaccept=strict` with the CA makes it verify.
 */
export function withVerifiedTlsForPrismaCli(connectionString: string, caPath: string): string {
  assertNoSslParams("DIRECT_URL", connectionString);
  const url = new URL(connectionString);
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("sslaccept", "strict");
  url.searchParams.set("sslcert", caPath);
  return url.toString();
}
