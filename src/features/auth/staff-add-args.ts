/**
 * Arguments of `npm run staff:add -- --email x --name y` (SPEC §7). Pure, so it is tested
 * apart from the script (scripts/staff-add.ts), which touches the database.
 */
import { parseArgs } from "node:util";

import { type StaffMemberInput, staffMemberInputSchema } from "./schema";

export const STAFF_ADD_USAGE = [
  'Uso: npm run staff:add -- --email <email> --name "<nombre y apellido>"',
  "",
  "Da de alta como staff activo a un usuario que ya existe en Supabase Auth",
  "(Authentication → Users → Add user). Si ya era staff, lo reactiva y actualiza el nombre.",
  "Usa la base de DATABASE_URL (.env.local, o la variable del shell, que gana).",
].join("\n");

export type StaffAddArgs =
  | { status: "ok"; input: StaffMemberInput }
  | { status: "help" }
  | { status: "error"; messages: string[] };

export function parseStaffAddArgs(argv: string[]): StaffAddArgs {
  let values: { email?: string; name?: string; help?: boolean };
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        email: { type: "string" },
        name: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch (error) {
    // parseArgs names the unknown or malformed flag; no user data in it.
    return { status: "error", messages: [error instanceof Error ? error.message : String(error)] };
  }

  if (values.help) return { status: "help" };

  const parsed = staffMemberInputSchema.safeParse({ email: values.email, fullName: values.name });
  if (!parsed.success) {
    return { status: "error", messages: parsed.error.issues.map((issue) => issue.message) };
  }
  return { status: "ok", input: parsed.data };
}
