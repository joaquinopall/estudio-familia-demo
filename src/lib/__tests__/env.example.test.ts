import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { publicEnvSchema, serverEnvSchema, validateEnv } from "@/lib/env.schema";

function readEnvExample(): Record<string, string> {
  const content = readFileSync(join(process.cwd(), ".env.example"), "utf8");
  const entries: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    entries[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return entries;
}

describe(".env.example", () => {
  const example = readEnvExample();

  it("declares exactly the variables defined in the env schemas", () => {
    const schemaKeys = [
      ...Object.keys(publicEnvSchema.shape),
      ...Object.keys(serverEnvSchema.shape),
    ].sort();

    expect(Object.keys(example).sort()).toEqual(schemaKeys);
  });

  it("is valid as-is, so copying it to .env.local is enough to start", () => {
    expect(() => validateEnv(example)).not.toThrow();
  });
});
