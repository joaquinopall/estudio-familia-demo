/**
 * `npm run inquiries:encrypt` (F5-02, ADR-0017): encrypts the messages and notes still stored
 * as plain text, and re-encrypts with the current key (the first of FIELD_ENCRYPTION_KEYS)
 * those that use an older one. Idempotent.
 *
 * Without --confirm it only counts (dry run). It prints counts and the Supabase project, never
 * a message, a note or a key.
 *
 * Runs with tsx and the react-server condition, like staff:add, so the `server-only` modules
 * load. Target database: DATABASE_URL and FIELD_ENCRYPTION_KEYS from .env.local (dev). For
 * prod, set both in the shell, which wins over .env.local.
 */
import { loadEnvConfig } from "@next/env";

const USAGE = [
  "Uso: npm run inquiries:encrypt [-- --confirm]",
  "",
  "  sin --confirm   cuenta lo que haría, sin escribir nada",
  "  --confirm       cifra los valores en claro y recifra los de una clave vieja",
].join("\n");

/** postgres.<project-ref> → <project-ref>, to show which Supabase project is being written. */
function projectRefOf(databaseUrl: string | undefined): string {
  if (!databaseUrl) return "(sin DATABASE_URL)";
  try {
    const user = decodeURIComponent(new URL(databaseUrl).username);
    return user.includes(".") ? (user.split(".")[1] ?? user) : "(proyecto desconocido)";
  } catch {
    return "(DATABASE_URL inválida)";
  }
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--confirm")) {
    console.error(USAGE);
    return 1;
  }
  const apply = args.includes("--confirm");

  loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });

  // Imported after loading the env: env.ts validates the variables on import.
  const { getDb } = await import("../src/lib/db");
  const { getFieldCipher } = await import("../src/lib/adapters");
  const { createPrismaReencryptionStore } = await import("../src/features/inquiries/repository");
  const { reencryptInquiries } = await import("../src/features/inquiries/reencryption");

  console.info(`Proyecto de Supabase: ${projectRefOf(process.env.DATABASE_URL)}`);
  console.info(apply ? "Modo: escribe (--confirm)." : "Modo: solo cuenta (sin --confirm).");

  const db = getDb();
  try {
    const counts = await reencryptInquiries(
      { cipher: getFieldCipher(), store: createPrismaReencryptionStore(db) },
      { apply },
    );
    console.info(
      `Consultas revisadas: ${counts.rows}. Campos en claro: ${counts.plain}. ` +
        `Campos con una clave vieja: ${counts.oldKey}. Consultas actualizadas: ${counts.updated}.`,
    );
    if (!apply && counts.plain + counts.oldKey > 0) {
      console.info("Para cifrarlos: npm run inquiries:encrypt -- --confirm");
    }
    return 0;
  } catch (error) {
    // Only the name: messages may carry values (the logger's rule, NFR-SEC-06).
    const name = error instanceof Error ? error.name : typeof error;
    const reason = (error as { reason?: string } | null)?.reason;
    console.error(
      `Se detuvo sin terminar (${name}${reason ? `: ${reason}` : ""}). ` +
        "Si es unknown_key o corrupted, falta en FIELD_ENCRYPTION_KEYS la clave con la que se cifró " +
        "ese valor: agregala (después de la actual) y volvé a correrlo. No se sobrescribió nada ilegible.",
    );
    return 1;
  } finally {
    await db.$disconnect();
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(`Error inesperado: ${error instanceof Error ? error.name : typeof error}`);
    process.exit(1);
  },
);
