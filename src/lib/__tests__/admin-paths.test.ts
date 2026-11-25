import { describe, expect, it } from "vitest";

import { adminPaths, isAdminPath } from "@/lib/admin-paths";
import { config } from "@/proxy";

describe("admin paths", () => {
  it.each(["/admin", "/admin/", "/admin/login", "/admin/consultas/123"])(
    "treats %s as part of the panel",
    (path) => {
      expect(isAdminPath(path)).toBe(true);
    },
  );

  it.each(["/", "/administracion", "/areas/admin", "/contacto"])(
    "does not treat %s as part of the panel",
    (path) => {
      expect(isAdminPath(path)).toBe(false);
    },
  );

  it("keeps the login inside the panel, where the proxy runs", () => {
    expect(isAdminPath(adminPaths.login)).toBe(true);
  });
});

describe("proxy matcher", () => {
  it("runs only on the panel, so public pages stay static and cookie-free", () => {
    expect(config.matcher).toEqual(["/admin/:path*"]);
  });
});
