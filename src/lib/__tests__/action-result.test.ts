import { describe, expect, it } from "vitest";
import { z } from "zod";

import { DEFAULT_ERROR_MESSAGES, fail, ok, validationFailure } from "@/lib/action-result";

describe("ok", () => {
  it("wraps data in a successful result", () => {
    expect(ok({ reference: "C-7F3A9B21" })).toEqual({
      ok: true,
      data: { reference: "C-7F3A9B21" },
    });
  });
});

describe("fail", () => {
  it("uses the default Spanish message for the code", () => {
    expect(fail("RATE_LIMITED")).toEqual({
      ok: false,
      error: { code: "RATE_LIMITED", message: DEFAULT_ERROR_MESSAGES.RATE_LIMITED },
    });
  });

  it("accepts a custom message and field errors", () => {
    const result = fail("VALIDATION", "Mensaje propio", { email: ["Ingresá un email válido"] });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Mensaje propio",
        fieldErrors: { email: ["Ingresá un email válido"] },
      },
    });
  });

  it("has a non-empty default message for every error code", () => {
    for (const message of Object.values(DEFAULT_ERROR_MESSAGES)) {
      expect(message.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("validationFailure", () => {
  const schema = z.object({
    email: z.email({ error: "Ingresá un email válido" }),
    message: z.string().min(20, { error: "Contanos un poco más (mínimo 20 caracteres)" }),
    phone: z.string().optional(),
  });

  it("maps Zod issues to field errors and omits valid fields", () => {
    const parsed = schema.safeParse({ email: "x", message: "corto" });
    if (parsed.success) throw new Error("expected validation to fail");

    const result = validationFailure(parsed.error);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "VALIDATION",
        message: DEFAULT_ERROR_MESSAGES.VALIDATION,
        fieldErrors: {
          email: ["Ingresá un email válido"],
          message: ["Contanos un poco más (mínimo 20 caracteres)"],
        },
      },
    });
  });
});
