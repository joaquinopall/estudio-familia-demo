/**
 * `npm run inquiries:purge` (F5-05, SPEC §7, NFR-PRIV-01): deletes the inquiries closed or
 * discarded more than RETENTION_MONTHS ago (24), as the privacy policy promises, with their
 * history. Open inquiries are never deleted: the old ones are only counted.
 *
 * Without --confirm it only counts (dry run). It prints counts, the cutoff date and the
 * Supabase project: never a name, an email, a message or an id. Deleting cannot be undone.
 *
 * Runs with tsx and the react-server condition, like staff:add. Target database: DATABASE_URL
 * from .env.local (dev). For prod, set it in the shell, which wins over .env.local.
 */
import { loadEnvConfig } from "@next/env";

import { RETENTION_MONTHS } from "../src/config/retention";
import { PURGE_USAGE, parsePurgeArgs } from "../src/features/inquiries/retention";

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

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

async function main(): Promise<number> {
  const args = parsePurgeArgs(process.argv.slice(2));
  if (args.status === "error") {
    console.error(`${args.message}\n\n${PURGE_USAGE}`);
    return 1;
  }

  loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });

  // Imported after loading the env: env.ts validates the variables on import.
  const { getDb } = await import("../src/lib/db");
  const { createPrismaRetentionStore } =
    await import("../src/features/inquiries/retention-repository");
  const { runRetention } = await import("../src/features/inquiries/retention");

  console.info(`Proyecto de Supabase: ${projectRefOf(process.env.DATABASE_URL)}`);
  console.info(args.apply ? "Modo: BORRA (--confirm)." : "Modo: solo cuenta (sin --confirm).");

  const db = getDb();
  try {
    const report = await runRetention(
      { store: createPrismaRetentionStore(db), now: new Date(), months: RETENTION_MONTHS },
      { apply: args.apply },
    );
    console.info(
      `Retención: ${RETENTION_MONTHS} meses desde el cierre. Fecha de corte: ${formatDate(report.cutoff)}.`,
    );
    console.info(`Consultas cerradas o descartadas antes de esa fecha: ${report.expired}.`);
    if (args.apply) {
      console.info(`Borradas, con su historial: ${report.deleted}.`);
    } else if (report.expired > 0) {
      console.info("Para borrarlas: npm run inquiries:purge -- --confirm");
    }
    if (report.openStale > 0) {
      console.warn(
        `Atención: ${report.openStale} consultas siguen abiertas y llegaron antes de ${formatDate(report.cutoff)}. ` +
          "No se borran: revisalas en el panel y cerralas o descartalas si ya no están en curso.",
      );
    }
    return 0;
  } catch (error) {
    // Only the name: messages may carry values (the logger's rule, NFR-SEC-06).
    console.error(
      `No se pudo completar (${error instanceof Error ? error.name : typeof error}). Se borra por tandas de 100: las que ya se borraron no vuelven y las demás quedan intactas. Volvé a correrlo para terminar.`,
    );
    return 1;
  } finally {
    await db.$disconnect();
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(`Error inesperado: ${error instanceof Error ? error.name : "desconocido"}`);
    process.exit(1);
  },
);
