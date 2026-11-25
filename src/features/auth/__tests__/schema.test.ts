import { describe, expect, it } from "vitest";

import {
  FULL_NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  signInMessages,
  signInSchema,
  staffMemberInputSchema,
  staffMemberMessages,
} from "@/features/auth/schema";

const valid = { email: "staff@example.com", password: "una-clave-larga-y-segura" };

function fieldErrors(input: Record<string, unknown>) {
  const result = signInSchema.safeParse(input);
  if (result.success) throw new Error("expected the schema to fail");
  return result.error.issues.map((issue) => ({ path: issue.path[0], message: issue.message }));
}

describe("signInSchema", () => {
  it("accepts a valid email and password", () => {
    expect(signInSchema.parse(valid)).toEqual(valid);
  });

  it("normalizes the email like the inquiry form (trim and lowercase)", () => {
    expect(signInSchema.parse({ ...valid, email: "  Staff@Example.COM " }).email).toBe(
      "staff@example.com",
    );
  });

  it("never trims the password: spaces can be part of it", () => {
    expect(signInSchema.parse({ ...valid, password: " clave con espacios " }).password).toBe(
      " clave con espacios ",
    );
  });

  it.each([undefined, "", "no-es-un-email", `${"a".repeat(250)}@example.com`])(
    "rejects the email %j",
    (email) => {
      expect(fieldErrors({ ...valid, email })).toEqual([
        { path: "email", message: signInMessages.email },
      ]);
    },
  );

  it.each([undefined, "", "x".repeat(PASSWORD_MAX_LENGTH + 1)])(
    "rejects the password %j",
    (password) => {
      expect(fieldErrors({ ...valid, password })).toEqual([
        { path: "password", message: signInMessages.password },
      ]);
    },
  );

  it("does not apply the 12-character rule: Supabase enforces it when the password is set", () => {
    expect(signInSchema.safeParse({ ...valid, password: "corta" }).success).toBe(true);
  });

  it("reports both fields at once", () => {
    expect(fieldErrors({}).map((issue) => issue.path)).toEqual(["email", "password"]);
  });
});

describe("staffMemberInputSchema (staff:add)", () => {
  const valid = { email: "Titular@Example.com ", fullName: "  Laura Gómez " };

  it("normalizes the email and trims the name", () => {
    expect(staffMemberInputSchema.parse(valid)).toEqual({
      email: "titular@example.com",
      fullName: "Laura Gómez",
    });
  });

  it.each([undefined, "", "no-es-un-email"])("rejects the email %j naming --email", (email) => {
    const result = staffMemberInputSchema.safeParse({ ...valid, email });

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([staffMemberMessages.email]);
  });

  it.each([undefined, " A ", "x".repeat(FULL_NAME_MAX_LENGTH + 1)])(
    "rejects the name %j naming --name",
    (fullName) => {
      const result = staffMemberInputSchema.safeParse({ ...valid, fullName });

      expect(result.error?.issues.map((issue) => issue.message)).toEqual([
        staffMemberMessages.fullName,
      ]);
    },
  );
});
