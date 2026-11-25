// @vitest-environment node
import { describe, expect, it } from "vitest";

import { staffMemberMessages } from "@/features/auth/schema";
import { StaffStoreError } from "@/features/auth/errors";
import { describeStaffAddError, parseStaffAddArgs } from "@/features/auth/staff-add-args";

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

describe("describeStaffAddError (staff:add failures)", () => {
  /** Shaped like Prisma's PrismaClientKnownRequestError, without importing Prisma. */
  function prismaError(code: string, meta: Record<string, unknown>) {
    const error = new Error("Unique constraint failed on the fields: (`email`) staff@example.com");
    error.name = "PrismaClientKnownRequestError";
    return Object.assign(error, { code, meta });
  }

  it("names the Prisma code and the columns (the error the script used to hide)", () => {
    const error = new StaffStoreError({ cause: prismaError("P2002", { target: ["email"] }) });

    expect(describeStaffAddError(error)).toBe(
      "StaffStoreError: PrismaClientKnownRequestError P2002 (email)",
    );
  });

  it("reads the columns from a driver adapter error too", () => {
    const meta = {
      modelName: "StaffMember",
      driverAdapterError: { cause: { constraint: { fields: ["auth_user_id"] } } },
    };

    expect(describeStaffAddError(new StaffStoreError({ cause: prismaError("P2002", meta) }))).toBe(
      "StaffStoreError: PrismaClientKnownRequestError P2002 (auth_user_id)",
    );
  });

  it("never prints messages or values, only identifiers", () => {
    const error = new StaffStoreError({
      cause: prismaError("P2002", { target: ["email", "staff@example.com", "x'; drop"] }),
    });

    const text = describeStaffAddError(error);

    expect(text).toContain("(email)");
    expect(text).not.toContain("@");
    expect(text).not.toContain("drop");
  });

  it("falls back to the error names when there is no Prisma code", () => {
    expect(describeStaffAddError(new StaffStoreError({ cause: new TypeError("boom") }))).toBe(
      "StaffStoreError: TypeError",
    );
    expect(describeStaffAddError("weird")).toBe("error desconocido");
  });
});
