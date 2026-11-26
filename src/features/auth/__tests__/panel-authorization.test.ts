/**
 * NFR-SEC-02 as a structural check (F5-02, ADR-0015): authorization lives in every admin page
 * and action, not only in the proxy or the layout. Reads the source, so a new page or action
 * that forgets it fails here before any review. The behavior (redirect, FORBIDDEN) is tested in
 * dal.test.ts, update-inquiry.test.ts and the panel e2e.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const ADMIN_DIR = join(ROOT, "src", "app", "admin");
const SRC_DIR = join(ROOT, "src");

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "generated" || entry.name === "__tests__" ? [] : filesUnder(path);
    }
    return [path];
  });
}

const toPosix = (path: string) => relative(ROOT, path).split(sep).join("/");
const read = (path: string) => readFileSync(path, "utf8");

/** Exported async functions of a "use server" file, with their body (up to the next export). */
function exportedActions(source: string): { name: string; body: string }[] {
  const pattern = /export async function (\w+)/g;
  const starts = [...source.matchAll(pattern)];
  return starts.map((match, index) => ({
    name: match[1] ?? "",
    body: source.slice(match.index, starts[index + 1]?.index ?? source.length),
  }));
}

/**
 * Every Server Action, classified. Public ones are protected by the anti-abuse chain (FR-06) or
 * the login rate limit; panel ones must authorize first. A new action fails the test until it
 * is added here, on purpose: someone has to decide which kind it is.
 */
const PUBLIC_ACTIONS = ["submitInquiry", "signIn", "signOut"];
const PANEL_ACTIONS = ["updateInquiryStatus", "updateInquiryNotes"];

describe("panel authorization in every page and action (NFR-SEC-02)", () => {
  const adminPages = filesUnder(ADMIN_DIR).filter((path) => path.endsWith("page.tsx"));

  it("every admin page except the login is inside (protected)", () => {
    const outside = adminPages
      .map(toPosix)
      .filter((path) => !path.includes("/(protected)/"))
      .filter((path) => path !== "src/app/admin/login/page.tsx");

    expect(outside).toEqual([]);
  });

  it("the (protected) layout calls requireStaff()", () => {
    const layout = read(join(ADMIN_DIR, "(protected)", "layout.tsx"));
    expect(layout).toMatch(/await requireStaff\(\)/);
  });

  it.each(
    adminPages.filter((path) => path.includes(`${sep}(protected)${sep}`)).map((p) => [toPosix(p)]),
  )("%s calls requireStaff() itself", (path) => {
    expect(read(join(ROOT, path))).toMatch(/await requireStaff\(\)/);
  });

  const serverActionFiles = filesUnder(SRC_DIR).filter(
    (path) => /\.tsx?$/.test(path) && /^["']use server["'];?/m.test(read(path)),
  );

  it("every Server Action is classified as public or panel", () => {
    const names = serverActionFiles.flatMap((path) =>
      exportedActions(read(path)).map((action) => action.name),
    );

    expect(names.sort()).toEqual([...PUBLIC_ACTIONS, ...PANEL_ACTIONS].sort());
  });

  it("every panel action goes through requireStaffForAction()", () => {
    const actionsFile = read(join(SRC_DIR, "features", "inquiries", "actions.ts"));
    const panel = exportedActions(actionsFile).filter((a) => PANEL_ACTIONS.includes(a.name));

    expect(panel.map((a) => a.name).sort()).toEqual([...PANEL_ACTIONS].sort());
    // The handlers are built with authorize: requireStaffForAction; update-inquiry.ts calls it
    // before reading the input (tested in update-inquiry.test.ts).
    expect(actionsFile).toMatch(/authorize: requireStaffForAction/);
    for (const action of panel) {
      expect(action.body, action.name).toMatch(/buildUpdateHandlers\(\)/);
    }
  });
});
