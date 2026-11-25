// @vitest-environment node
import { describe, expect, it } from "vitest";

import { staffMemberMessages } from "@/features/auth/schema";
import { parseStaffAddArgs } from "@/features/auth/staff-add-args";

describe("parseStaffAddArgs (npm run staff:add)", () => {
  it("reads --email and --name, normalizing them", () => {
    expect(
      parseStaffAddArgs(["--email", " Titular@Example.com ", "--name", "  Laura Gómez "]),
    ).toEqual({
      status: "ok",
      input: { email: "titular@example.com", fullName: "Laura Gómez" },
    });
  });

  it("accepts the --flag=value form", () => {
    expect(parseStaffAddArgs(["--email=a@example.com", "--name=Ana Pérez"]).status).toBe("ok");
  });

  it.each([["--help"], ["-h"]])("shows the usage with %s", (flag) => {
    expect(parseStaffAddArgs([flag])).toEqual({ status: "help" });
  });

  it("reports every missing or invalid value at once, naming the flags", () => {
    expect(parseStaffAddArgs(["--email", "no-es-un-email"])).toEqual({
      status: "error",
      messages: [staffMemberMessages.email, staffMemberMessages.fullName],
    });
  });

  it("rejects a one-letter name", () => {
    expect(parseStaffAddArgs(["--email", "a@example.com", "--name", "A"])).toEqual({
      status: "error",
      messages: [staffMemberMessages.fullName],
    });
  });

  it.each([[["--emial", "a@example.com"]], [["a@example.com"]], [["--email"]]])(
    "rejects unknown flags, positionals and flags without a value: %j",
    (argv) => {
      expect(parseStaffAddArgs(argv).status).toBe("error");
    },
  );
});
