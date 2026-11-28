/**
 * The manual test guide stays usable (F5-07): every case of the results board has its section
 * and the other way round, sections go in numeric order, each one follows the template, and
 * the minimum cases of SPEC §13 are all there.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const testing = read("docs/TESTING.md");
const spec = read("docs/SPEC.md");

/** Each "### MT-XX — Title" section, up to the next heading of the same or a higher level. */
const sections = [...testing.matchAll(/^### (MT-\d{2}) — .*$/gm)].map((match, index, all) => ({
  id: match[1] ?? "",
  body: testing.slice(match.index, all[index + 1]?.index ?? testing.length),
}));

const board = testing.slice(
  testing.indexOf("### Tablero de resultados"),
  testing.indexOf("### MT-01 — "),
);
const boardIds = [...board.matchAll(/^\| \[(MT-\d{2})\]/gm)].map((match) => match[1]);

describe("manual test guide (docs/TESTING.md)", () => {
  it("has a section for every case of the results board, and no other", () => {
    expect(boardIds.length).toBeGreaterThan(0);
    expect(sections.map((section) => section.id)).toEqual(boardIds);
  });

  it("keeps the sections in numeric order, without gaps or repeats", () => {
    const numbers = sections.map((section) => Number(section.id.slice(3)));
    expect(numbers).toEqual(numbers.map((_, index) => index + 1));
  });

  it.each(sections.map((section) => [section.id, section.body]))(
    "%s follows the template: objective, requirements, steps, expected result and its table",
    (_id, body) => {
      expect(body).toContain("- **Objetivo:**");
      expect(body).toContain("- **Requisitos:**");
      expect(body).toContain("**Pasos**");
      expect(body).toContain("**Resultado esperado**");
      expect(body).toMatch(/^\| Fecha +\| Entorno +\| Resultado +\| Notas +\|$/m);
    },
  );

  it("includes every minimum case of SPEC §13", () => {
    const required = [...spec.matchAll(/^\| (MT-\d{2}) \|/gm)].map((match) => match[1]);

    expect(required.length).toBeGreaterThanOrEqual(15);
    expect(boardIds).toEqual(expect.arrayContaining(required));
  });
});
