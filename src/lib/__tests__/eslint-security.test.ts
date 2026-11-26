/**
 * The security guards of eslint.config.mjs (F5-02, docs/SECURITY_REVIEW.md): each one rejects
 * the forbidden pattern and lets the allowed one through, with the project's real config.
 */
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: process.cwd() });

/** Rule ids that fire for `code`, linted as if it lived at `filePath`. */
async function firedRules(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((message) => message.ruleId ?? "parse-error");
}

describe("ESLint security guards (SPEC §10)", () => {
  // Loading the config and its plugins takes seconds the first time.
  beforeAll(async () => {
    await firedRules("export {};", "src/x.ts");
  }, 60_000);
  describe("SQL injection: no unsafe raw SQL", () => {
    it.each([
      ["$queryRawUnsafe", "export const q = (db: any, s: string) => db.$queryRawUnsafe(s);"],
      ["$executeRawUnsafe", "export const q = (db: any, s: string) => db.$executeRawUnsafe(s);"],
      ["Prisma.raw", "declare const Prisma: any;\nexport const q = (s: string) => Prisma.raw(s);"],
    ])("rejects %s", async (_name, code) => {
      expect(await firedRules(code, "src/features/x/repository.ts")).toContain(
        "no-restricted-syntax",
      );
    });

    it("allows the parameterized $queryRaw tagged template", async () => {
      const code = "export const q = (db: any, id: string) => db.$queryRaw`select ${id}`;";
      expect(await firedRules(code, "src/features/x/repository.ts")).not.toContain(
        "no-restricted-syntax",
      );
    });

    it("also applies in the JSON-LD helper and outside src (scripts)", async () => {
      const code = "export const q = (db: any, s: string) => db.$queryRawUnsafe(s);";
      expect(await firedRules(code, "src/lib/seo/json-ld.tsx")).toContain("no-restricted-syntax");
      expect(await firedRules(code, "scripts/x.ts")).toContain("no-restricted-syntax");
    });
  });

  describe("XSS: no dangerouslySetInnerHTML", () => {
    const code = 'export const X = () => <div dangerouslySetInnerHTML={{ __html: "x" }} />;';

    it("rejects it in a component", async () => {
      expect(await firedRules(code, "src/components/x.tsx")).toContain("no-restricted-syntax");
    });

    it("allows it only in the JSON-LD helper", async () => {
      expect(await firedRules(code, "src/lib/seo/json-ld.tsx")).not.toContain(
        "no-restricted-syntax",
      );
    });
  });

  describe("secrets: no loose process.env", () => {
    const code = "export const key = process.env.RESEND_API_KEY;";

    it("rejects it in app code (server or client)", async () => {
      expect(await firedRules(code, "src/features/x/service.ts")).toContain(
        "no-restricted-properties",
      );
      expect(await firedRules(code, "src/components/x.tsx")).toContain("no-restricted-properties");
    });

    it.each(["src/lib/env.ts", "src/lib/env.public.ts", "src/lib/env.schema.ts"])(
      "allows it in %s",
      async (filePath) => {
        expect(await firedRules(code, filePath)).not.toContain("no-restricted-properties");
      },
    );

    it("allows it in tests", async () => {
      expect(await firedRules(code, "src/lib/__tests__/x.test.ts")).not.toContain(
        "no-restricted-properties",
      );
    });
  });
});
