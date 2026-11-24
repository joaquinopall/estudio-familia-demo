// @vitest-environment node
/**
 * Guards NFR-SEC-03: every table in the public schema has Row Level Security enabled by a
 * migration, so the Supabase Data API cannot read it. If you add a model or a table and this
 * test fails, add `ALTER TABLE "<table>" ENABLE ROW LEVEL SECURITY;` to its migration.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const prismaDir = join(process.cwd(), "prisma");
const migrationsDir = join(prismaDir, "migrations");

/** Table names of the Prisma models: the @@map name, or the model name when there is none. */
function schemaTables(schema: string): string[] {
  const models = schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm);
  return [...models].map(([, name, body]) => body?.match(/@@map\("([^"]+)"\)/)?.[1] ?? name ?? "");
}

function migrationsSql(): string {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((dir) => readFileSync(join(migrationsDir, dir, "migration.sql"), "utf8"))
    .join("\n");
}

const namesFrom = (sql: string, pattern: RegExp) =>
  new Set([...sql.matchAll(pattern)].map(([, table]) => table ?? ""));

describe("Row Level Security in migrations (NFR-SEC-03)", () => {
  const schema = readFileSync(join(prismaDir, "schema.prisma"), "utf8");
  const sql = migrationsSql();
  const createdTables = namesFrom(sql, /CREATE TABLE\s+(?:"public"\.)?"?(\w+)"?/gi);
  const rlsTables = namesFrom(
    sql,
    /ALTER TABLE\s+(?:"public"\.)?"?(\w+)"?\s+ENABLE ROW LEVEL SECURITY/gi,
  );

  it("finds the models of the schema (sanity check of the parser)", () => {
    expect(schemaTables(schema)).toEqual(["inquiries", "inquiry_events", "staff_members"]);
  });

  it.each(schemaTables(schema))("enables RLS on the model table %s", (table) => {
    expect(rlsTables).toContain(table);
  });

  it("enables RLS on every table created by a migration", () => {
    expect([...createdTables].filter((table) => !rlsTables.has(table))).toEqual([]);
  });

  it("enables RLS on _prisma_migrations, which Prisma creates in public", () => {
    expect(rlsTables).toContain("_prisma_migrations");
  });

  it("never disables RLS", () => {
    expect(sql).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
  });
});
