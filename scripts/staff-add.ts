/**
 * `npm run staff:add -- --email x --name y` (SPEC §7, ADR-0015): links an existing Supabase
 * Auth user as active staff.
 *
 * Runs with tsx and the react-server condition, so the app modules guarded by `server-only`
 * (db.ts, env.ts, the repository) load the same way they do on the server. It reuses the
 * repository and db.ts, with the same verified TLS.
 *
 * Target database: DATABASE_URL from .env.local (dev). For prod, set it in the shell, which
 * wins over .env.local: DATABASE_URL="<prod url>" npm run staff:add -- ...
 */
import { loadEnvConfig } from "@next/env";

import {
  STAFF_ADD_USAGE,
  describeStaffAddError,
  parseStaffAddArgs,
} from "../src/features/auth/staff-add-args";

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
  const args = parseStaffAddArgs(process.argv.slice(2));
  if (args.status === "help") {
    console.info(STAFF_ADD_USAGE);
    return 0;
  }
  if (args.status === "error") {
    console.error([...args.messages, "", STAFF_ADD_USAGE].join("\n"));
    return 1;
  }

  // Like `next dev`: .env.local and friends; variables already in the shell win.
  loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });

  // Imported after loading the env: env.ts validates the variables on import.
  const { getDb } = await import("../src/lib/db");
  const { createPrismaStaffRepository } = await import("../src/features/auth/repository");
  const { addStaffMember } = await import("../src/features/auth/staff-service");

  console.info(`Proyecto de Supabase: ${projectRefOf(process.env.DATABASE_URL)}`);
  const db = getDb();
  try {
    const result = await addStaffMember(args.input, createPrismaStaffRepository(db));
    switch (result.status) {
      case "auth_user_not_found":
        console.error(
          `No existe un usuario de Supabase Auth con el email ${args.input.email}.\n` +
            "Crealo primero en Supabase → Authentication → Users → Add user (con Auto Confirm User).",
        );
        return 1;
      case "created":
        console.info(
          `Staff dado de alta: ${result.member.fullName} <${result.member.email}> (id ${result.member.id}).`,
        );
        return 0;
      case "updated":
        console.info(
          `Staff actualizado y activo: ${result.member.fullName} <${result.member.email}> (id ${result.member.id}).`,
        );
        return 0;
      case "relinked":
        console.info(
          `El usuario de Auth se había vuelto a crear: se vinculó el staff existente al usuario nuevo y quedó activo.\n` +
            `${result.member.fullName} <${result.member.email}> (id ${result.member.id}).`,
        );
        return 0;
      case "email_in_use":
        console.error(
          `Ya hay un staff con el email ${args.input.email}, vinculado a otro usuario de Supabase Auth que sigue existiendo\n` +
            "(probablemente cambió su email en Auth). No se modificó nada: revisá staff_members en el Table Editor.",
        );
        return 1;
    }
  } catch (error) {
    // Error names, Prisma code and columns only: messages may contain connection details or values.
    console.error(`No se pudo dar de alta el staff (${describeStaffAddError(error)}).`);
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
