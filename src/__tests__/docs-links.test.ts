import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Keeps the documentation navigable (CLAUDE.md §6): every relative Markdown link in the repo's
 * docs must point to a file or folder that exists. External links (http, mailto) and in-page
 * anchors are not checked.
 */

const ROOT = process.cwd();
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "coverage", "playwright-report"]);

function collectMarkdown(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...collectMarkdown(path));
    else if (entry.endsWith(".md")) files.push(path);
  }
  return files;
}

const MARKDOWN_FILES = [
  ...["README.md", "CHANGELOG.md", "CLAUDE.md"].map((file) => join(ROOT, file)),
  ...collectMarkdown(join(ROOT, "docs")),
  ...collectMarkdown(join(ROOT, "src")),
].filter((file) => existsSync(file));

/** Inline links `[text](target)`, ignoring fenced code blocks. */
function relativeLinks(markdown: string): string[] {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, "");
  const links: string[] = [];
  for (const match of withoutCode.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (!target || /^(https?:|mailto:|tel:|#)/.test(target)) continue;
    links.push(target);
  }
  return links;
}

describe("documentation links", () => {
  it("finds the documentation files to check", () => {
    expect(MARKDOWN_FILES.length).toBeGreaterThan(5);
  });

  it.each(MARKDOWN_FILES.map((file) => [relative(ROOT, file), file]))(
    "%s has no broken relative links",
    (_name, file) => {
      const broken = relativeLinks(readFileSync(file, "utf8")).filter((target) => {
        const path = decodeURIComponent(target.split("#")[0] ?? "");
        return !existsSync(resolve(dirname(file), path));
      });

      expect(broken).toEqual([]);
    },
  );
});
