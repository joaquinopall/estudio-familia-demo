/**
 * `npm run demo:seed` (F5-08): loads 8 example inquiries, marked "[Ejemplo]", so the demo's
 * panel is not empty. Only in demo mode (NEXT_PUBLIC_DEMO_MODE on); idempotent; --remove
 * deletes them. Without arguments it only says what it would do. It prints the Supabase
 * project and counts, never inquiry data.
 *
 * Runs with tsx and the react-server condition, like staff:add. Target database: DATABASE_URL
 * and FIELD_ENCRYPTION_KEYS from .env.local (dev). For prod, set both in the shell, which wins
 * over .env.local. Needs an active staff member (npm run staff:add) as the actor of the history.
 */
import { loadEnvConfig } from "@next/env";

import { DEMO_SEED_USAGE, parseDemoSeedArgs } from "../src/features/inquiries/demo-seed";

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
  const args = parseDemoSeedArgs(process.argv.slice(2));
  if (args.status === "error") {
    console.error(`${args.message}\n\n${DEMO_SEED_USAGE}`);
    return 1;
  }

  loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });

  // Imported after loading the env: env.ts validates the variables on import.
  const { env } = await import("../src/lib/env");
  const { getDb } = await import("../src/lib/db");
  const { getFieldCipher } = await import("../src/lib/adapters");
  const { privacyPolicy } = await import("../src/content/legal/privacy");
  const { createPrismaInquiryRepository } = await import("../src/features/inquiries/repository");
  const { createPrismaDemoSeedStore } =
    await import("../src/features/inquiries/demo-seed-repository");
  const { runDemoSeed } = await import("../src/features/inquiries/demo-seed");

  console.info(`Proyecto de Supabase: ${projectRefOf(process.env.DATABASE_URL)}`);
  const db = getDb();
  try {
    const result = await runDemoSeed(
      {
        repository: createPrismaInquiryRepository(db, getFieldCipher()),
        store: createPrismaDemoSeedStore(db),
        now: new Date(),
        privacyPolicyVersion: privacyPolicy.version,
        demoMode: env.NEXT_PUBLIC_DEMO_MODE,
      },
      args.mode,
    );
    switch (result.status) {
      case "refused_not_demo":
        console.error(
          "NEXT_PUBLIC_DEMO_MODE está en false: esta base es de un estudio real. No se cargó nada.",
        );
        return 1;
      case "no_staff":
        console.error(
          "No hay ningún staff activo. Corré antes: npm run staff:add -- --email ... --name ...",
        );
        return 1;
      case "already_seeded":
        console.info(`Ya hay ${result.existing} consultas de ejemplo: no se agregó nada.`);
        return 0;
      case "planned":
        console.info(
          `Cargaría ${result.count} consultas de ejemplo ("[Ejemplo] …"). Para hacerlo: npm run demo:seed -- --confirm`,
        );
        return 0;
      case "seeded":
        console.info(
          `Cargadas ${result.count} consultas de ejemplo, con su historial y sus notas.`,
        );
        return 0;
      case "removed":
        console.info(`Borradas ${result.count} consultas de ejemplo, con su historial.`);
        return 0;
    }
  } catch (error) {
    // Only the name: messages may carry values (the logger's rule, NFR-SEC-06).
    console.error(`No se pudo completar (${error instanceof Error ? error.name : typeof error}).`);
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
