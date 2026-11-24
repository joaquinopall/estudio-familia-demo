import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  INQUIRY_MESSAGES as M,
  type InquiryFormInput,
  inquirySchema,
  isHoneypotFilled,
} from "@/features/inquiries/schema";

/** A valid submission, shaped like Object.fromEntries(formData). */
const VALID: Record<string, string> = {
  area: "SUCCESSION",
  urgency: "NORMAL",
  message: "Falleció mi papá y queremos iniciar la sucesión con mis hermanos.",
  fullName: "Ana Pérez",
  email: "ana@example.com",
  phone: "+54 9 11 5555-1234",
  preferredChannel: "WHATSAPP",
  safeToContact: "true",
  emailIsPrivate: "true",
  consent: "on",
};

function parse(overrides: Record<string, string | undefined> = {}) {
  const input: Record<string, unknown> = { ...VALID, ...overrides };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete input[key];
  }
  return inquirySchema.safeParse(input as InquiryFormInput);
}

function fieldErrors(overrides: Record<string, string | undefined>) {
  const result = parse(overrides);
  expect(result.success).toBe(false);
  return result.success
    ? {}
    : (z.flattenError(result.error).fieldErrors as Record<string, string[]>);
}

const errorsOf = (field: string, overrides: Record<string, string | undefined>) =>
  fieldErrors(overrides)[field];

describe("inquirySchema (SPEC §8.1)", () => {
  it("accepts a complete submission and returns domain types", () => {
    const result = parse({ website: "", "cf-turnstile-response": "token" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      area: "SUCCESSION",
      urgency: "NORMAL",
      message: VALID.message,
      fullName: "Ana Pérez",
      email: "ana@example.com",
      phone: "+54 9 11 5555-1234",
      preferredChannel: "WHATSAPP",
      safeToContact: true,
      emailIsPrivate: true,
      consent: true,
    });
  });

  describe("area and urgency", () => {
    it.each([undefined, "", "LEGAL"])("rejects area %j", (area) => {
      expect(errorsOf("area", { area })).toEqual([M.area]);
    });

    it.each(["SUCCESSION", "DIVORCE", "CHILD_SUPPORT", "PARENTING", "AGREEMENTS", "OTHER"])(
      "accepts area %s",
      (area) => {
        expect(parse({ area }).success).toBe(true);
      },
    );

    it.each([undefined, "", "URGENT"])("rejects urgency %j", (urgency) => {
      expect(errorsOf("urgency", { urgency })).toEqual([M.urgency]);
    });

    it.each(["LOW", "NORMAL", "HIGH"])("accepts urgency %s", (urgency) => {
      expect(parse({ urgency }).success).toBe(true);
    });
  });

  describe("message", () => {
    it("trims and accepts 20 to 2000 characters", () => {
      expect(parse({ message: `  ${"a".repeat(20)}  ` }).data?.message).toBe("a".repeat(20));
      expect(parse({ message: "a".repeat(2000) }).success).toBe(true);
    });

    it.each([undefined, "", "a".repeat(19), `   ${"a".repeat(19)}   `])(
      "asks for more text when it is too short (%j)",
      (message) => {
        expect(errorsOf("message", { message })).toEqual([M.messageTooShort]);
      },
    );

    it("rejects more than 2000 characters", () => {
      expect(errorsOf("message", { message: "a".repeat(2001) })).toEqual([M.messageTooLong]);
    });
  });

  describe("fullName", () => {
    it.each([
      ["José Peña-Müller", "José Peña-Müller"],
      ["  Ana Pérez  ", "Ana Pérez"],
      ["D'Angelo", "D'Angelo"],
      ["O’Brien", "O'Brien"],
      ["Jo", "Jo"],
    ])("accepts %j and stores %j", (fullName, expected) => {
      expect(parse({ fullName }).data?.fullName).toBe(expected);
    });

    it("normalizes decomposed accents (NFD from some keyboards) to NFC", () => {
      const decomposed = "José";
      expect(parse({ fullName: decomposed }).data?.fullName).toBe("José");
    });

    it("accepts up to 120 characters", () => {
      expect(parse({ fullName: "a".repeat(120) }).success).toBe(true);
    });

    it.each([
      undefined,
      "",
      " ",
      "A",
      "a".repeat(121),
      "Ana2",
      "Ana <b>",
      "ana@x.com",
      "Ana_Pérez",
    ])("rejects %j", (fullName) => {
      expect(errorsOf("fullName", { fullName })).toContain(M.fullName);
    });
  });

  describe("email", () => {
    it("trims and lowercases", () => {
      expect(parse({ email: "  Ana.Perez@Example.COM " }).data?.email).toBe(
        "ana.perez@example.com",
      );
    });

    it("accepts up to 254 characters", () => {
      const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(57)}.com`;
      expect(email).toHaveLength(254);
      expect(parse({ email }).success).toBe(true);
    });

    it("rejects more than 254 characters", () => {
      const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(58)}.com`;
      expect(errorsOf("email", { email })).toContain(M.email);
    });

    it.each([undefined, "", "ana", "ana@", "@example.com", "ana@example", "ana perez@example.com"])(
      "rejects %j",
      (email) => {
        expect(errorsOf("email", { email })).toContain(M.email);
      },
    );
  });

  describe("phone (optional)", () => {
    it.each([undefined, "", "   "])("is null when empty (%j) with the email channel", (phone) => {
      const result = parse({ phone, preferredChannel: "EMAIL", safeToContact: undefined });
      expect(result.data?.phone).toBeNull();
    });

    it.each(["12345678", "+54 11 4555-1234", "+54 9 11 5555-1234", "1".repeat(20)])(
      "accepts %j",
      (phone) => {
        expect(parse({ phone }).data?.phone).toBe(phone);
      },
    );

    it.each([
      ["7 digits", "1234567"],
      ["21 digits", "1".repeat(21)],
      ["letters", "11 4555 abcd"],
      ["parentheses (not in SPEC §8.1)", "(011) 4555-1234"],
      ["dots", "11.4555.1234"],
      ["more than 30 characters", "1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6"],
    ])("rejects %s", (_label, phone) => {
      expect(errorsOf("phone", { phone })).toEqual([M.phone]);
    });
  });

  describe("preferredChannel", () => {
    it.each([undefined, "", "SMS"])("rejects %j", (preferredChannel) => {
      expect(errorsOf("preferredChannel", { preferredChannel })).toEqual([M.preferredChannel]);
    });

    it.each(["PHONE", "WHATSAPP"])("requires a phone for %s", (preferredChannel) => {
      expect(errorsOf("phone", { preferredChannel, phone: "" })).toEqual([M.phoneRequired]);
    });

    it("does not require a phone for EMAIL", () => {
      expect(
        parse({ preferredChannel: "EMAIL", phone: "", safeToContact: undefined }).success,
      ).toBe(true);
    });

    it("keeps an invalid phone as a format error, not as missing", () => {
      expect(errorsOf("phone", { preferredChannel: "PHONE", phone: "123" })).toEqual([M.phone]);
    });
  });

  describe("safeToContact (US-03 CA6)", () => {
    it.each(["PHONE", "WHATSAPP"])("is required for %s, with no default", (preferredChannel) => {
      expect(errorsOf("safeToContact", { preferredChannel, safeToContact: undefined })).toEqual([
        M.safeToContact,
      ]);
    });

    it.each([
      ["true", true],
      ["false", false],
    ])("parses %j as %s for phone channels", (safeToContact, expected) => {
      expect(parse({ safeToContact }).data?.safeToContact).toBe(expected);
    });

    it.each(["", "yes", "on", "1"])("rejects %j", (safeToContact) => {
      expect(errorsOf("safeToContact", { safeToContact })).toContain(M.safeToContact);
    });

    it.each([undefined, "true", "false"])(
      "is null for EMAIL whatever the form sent (%j)",
      (safeToContact) => {
        const result = parse({ preferredChannel: "EMAIL", safeToContact });
        expect(result.success).toBe(true);
        expect(result.data?.safeToContact).toBeNull();
      },
    );
  });

  describe("emailIsPrivate (US-03 CA7)", () => {
    it.each([
      ["true", true],
      ["false", false],
    ])("parses %j as %s", (emailIsPrivate, expected) => {
      expect(parse({ emailIsPrivate }).data?.emailIsPrivate).toBe(expected);
    });

    it.each(["WHATSAPP", "PHONE", "EMAIL"])(
      "is required for %s, with no default",
      (preferredChannel) => {
        expect(errorsOf("emailIsPrivate", { preferredChannel, emailIsPrivate: undefined })).toEqual(
          [M.emailIsPrivate],
        );
      },
    );

    it.each(["", "yes", "on"])("rejects %j", (emailIsPrivate) => {
      expect(errorsOf("emailIsPrivate", { emailIsPrivate })).toEqual([M.emailIsPrivate]);
    });
  });

  describe("consent (US-07 CA2)", () => {
    it.each(["on", "true"])("accepts the checked box (%j)", (consent) => {
      expect(parse({ consent }).data?.consent).toBe(true);
    });

    it.each([undefined, "", "false", "off"])("rejects %j", (consent) => {
      expect(errorsOf("consent", { consent })).toEqual([M.consent]);
    });
  });

  it("drops unknown keys such as the honeypot and the Turnstile token", () => {
    const result = parse({ website: "spam", "cf-turnstile-response": "token", extra: "x" });
    expect(result.data).not.toHaveProperty("website");
    expect(result.data).not.toHaveProperty("cf-turnstile-response");
    expect(result.data).not.toHaveProperty("extra");
  });

  it("reports every invalid field at once, conditional rules included (US-03 CA2)", () => {
    const errors = fieldErrors({
      fullName: "",
      message: "corto",
      preferredChannel: "WHATSAPP",
      phone: "",
      safeToContact: undefined,
      emailIsPrivate: undefined,
      consent: undefined,
    });

    expect(errors).toEqual({
      fullName: [M.fullName],
      message: [M.messageTooShort],
      phone: [M.phoneRequired],
      safeToContact: [M.safeToContact],
      emailIsPrivate: [M.emailIsPrivate],
      consent: [M.consent],
    });
  });

  // Regression: a field that aborts parsing (pipe, abort: true) made Zod skip the channel rules.
  it.each([
    ["area", "LEGAL"],
    ["urgency", "URGENT"],
    ["message", "corto"],
    ["fullName", ""],
    ["fullName", "Ana2"],
    ["email", "nope"],
    ["phone", "abc"],
    ["emailIsPrivate", "maybe"],
    ["consent", "off"],
  ])("still reports the channel rules when %s is invalid (%j)", (field, value) => {
    const errors = fieldErrors({ [field]: value, safeToContact: undefined });

    expect(errors[field]).toBeDefined();
    expect(errors.safeToContact).toEqual([M.safeToContact]);
  });

  it("never echoes the submitted values in its messages", () => {
    const result = parse({ fullName: "Ana <script>", email: "ana-secret@", phone: "abc" });
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);

    expect(messages.join(" ")).not.toMatch(/script|ana-secret|abc/);
  });
});

describe("isHoneypotFilled (SPEC §8.1, FR-06)", () => {
  const formWith = (value?: string | Blob) => {
    const formData = new FormData();
    if (value !== undefined) formData.set("website", value);
    return formData;
  };

  it.each([
    ["missing", undefined, false],
    ["empty", "", false],
    ["blank", "   ", false],
    ["filled", "https://spam.example", true],
    ["a file", new Blob(["x"]), true],
  ])("%s → %s", (_label, value, expected) => {
    expect(isHoneypotFilled(formWith(value))).toBe(expected);
  });
});
