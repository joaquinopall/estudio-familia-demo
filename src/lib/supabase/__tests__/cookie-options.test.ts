import { describe, expect, it } from "vitest";

import { buildAuthCookieOptions } from "@/lib/supabase/cookie-options";

describe("buildAuthCookieOptions (NFR-SEC-07)", () => {
  it("is httpOnly, Secure and SameSite=Lax on an https site", () => {
    expect(buildAuthCookieOptions("https://demo.example.com")).toEqual({
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
  });

  it("turns Secure off only for an http site (local development)", () => {
    expect(buildAuthCookieOptions("http://localhost:3000")).toMatchObject({
      httpOnly: true,
      secure: false,
    });
  });
});
