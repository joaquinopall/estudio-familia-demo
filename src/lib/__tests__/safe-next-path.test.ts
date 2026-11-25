/**
 * `next` after the login (F4-06) must never become an open redirect (SPEC §10.2): only panel
 * paths, after parsing and normalizing the URL.
 */
import { describe, expect, it } from "vitest";

import { NEXT_MAX_LENGTH, loginPathFor, safeNextPath } from "@/lib/admin-paths";

const DETAIL = "/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b";

describe("safeNextPath", () => {
  it.each([
    [DETAIL, DETAIL],
    ["/admin", "/admin"],
    ["/admin?status=NEW&page=2", "/admin?status=NEW&page=2"],
    [`${DETAIL}#historial`, DETAIL],
    ["/admin/consultas/../consultas/x", "/admin/consultas/x"],
  ])("accepts the panel path %j as %j", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    // Other sites.
    "https://evil.example/admin",
    "//evil.example/admin",
    "///evil.example/admin",
    "/\\evil.example/admin",
    "\\\\evil.example/admin",
    "/\t/evil.example/admin",
    "/\n/evil.example",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    // Encoded tricks.
    "/%2F%2Fevil.example",
    "/admin/%2e%2e/%2e%2e/contacto",
    // Out of the panel.
    "/",
    "/contacto",
    "/administracion",
    "/admin/../contacto",
    "admin",
    // The login would loop.
    "/admin/login",
    "/admin/login?next=/admin",
    "/admin/login/",
    // Not a usable value.
    "",
    `/admin/${"x".repeat(NEXT_MAX_LENGTH)}`,
  ])("rejects %j", (input) => {
    expect(safeNextPath(input)).toBeNull();
  });

  it.each([undefined, null, 42, ["/admin"], { next: "/admin" }])(
    "rejects a non-string value (%j)",
    (input) => {
      expect(safeNextPath(input)).toBeNull();
    },
  );
});

describe("loginPathFor (the proxy's redirect)", () => {
  it("adds the page to come back to, encoded", () => {
    expect(loginPathFor(DETAIL)).toBe(`/admin/login?next=${encodeURIComponent(DETAIL)}`);
  });

  it("keeps the query of a filtered list", () => {
    expect(loginPathFor("/admin?status=NEW")).toBe(
      `/admin/login?next=${encodeURIComponent("/admin?status=NEW")}`,
    );
  });

  it("needs no next for the panel's home (the default destination)", () => {
    expect(loginPathFor("/admin")).toBe("/admin/login");
  });

  it("drops anything that is not a safe panel path", () => {
    expect(loginPathFor("//evil.example")).toBe("/admin/login");
  });
});
