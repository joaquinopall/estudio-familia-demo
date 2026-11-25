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

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Column names only: anything that does not look like an identifier could be a value. */
function columnsOf(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return list.filter((item): item is string => typeof item === "string" && IDENTIFIER.test(item));
}

/**
 * A short, safe description of a staff:add failure: error names, the Prisma code (e.g. P2002)
 * and the columns involved, never messages or values (they may contain emails or URLs).
 */
export function describeStaffAddError(error: unknown): string {
  if (!(error instanceof Error)) return "error desconocido";
  const cause = error.cause as
    { name?: unknown; code?: unknown; meta?: Record<string, unknown> } | undefined;
  const parts = [error.name];
  if (cause && typeof cause.name === "string") parts.push(cause.name);
  const code = typeof cause?.code === "string" && /^P\d{4}$/.test(cause.code) ? cause.code : null;
  if (!code) return parts.join(": ");

  // Prisma puts the columns in meta.target; with driver adapters, inside driverAdapterError.
  const adapterCause = (
    cause?.meta?.driverAdapterError as { cause?: { constraint?: { fields?: unknown } } }
  )?.cause;
  const columns = columnsOf(cause?.meta?.target ?? adapterCause?.constraint?.fields);
  return `${parts.join(": ")} ${code}${columns.length > 0 ? ` (${columns.join(", ")})` : ""}`;
}

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
