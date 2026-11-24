import { describe, expect, it } from "vitest";

import { planContact } from "@/features/inquiries/contact-safety";
import type { ContactChannel } from "@/features/inquiries/types";

type Row = [
  preferredChannel: ContactChannel,
  safeToContact: boolean | null,
  emailIsPrivate: boolean,
  expectedChannel: ContactChannel | null,
  expectedReceipt: boolean,
];

/**
 * Every combination, written out by hand so it can be read against US-03 CA6 and CA7.
 * null in the channel column = "No iniciar contacto".
 */
const TABLE: Row[] = [
  // Phone channels, safe: contact by the chosen channel; receipt only to a private email.
  ["WHATSAPP", true, true, "WHATSAPP", true],
  ["WHATSAPP", true, false, "WHATSAPP", false],
  ["PHONE", true, true, "PHONE", true],
  ["PHONE", true, false, "PHONE", false],
  // Phone channels, not safe: fall back to email only if it is private (CA6).
  ["WHATSAPP", false, true, "EMAIL", true],
  ["WHATSAPP", false, false, null, false],
  ["PHONE", false, true, "EMAIL", true],
  ["PHONE", false, false, null, false],
  // Phone channels, unanswered (should not pass validation): treated as not safe.
  ["WHATSAPP", null, true, "EMAIL", true],
  ["WHATSAPP", null, false, null, false],
  ["PHONE", null, true, "EMAIL", true],
  ["PHONE", null, false, null, false],
  // Email: safe only if private (CA7). safeToContact does not apply to email.
  ["EMAIL", null, true, "EMAIL", true],
  ["EMAIL", null, false, null, false],
  ["EMAIL", true, true, "EMAIL", true],
  ["EMAIL", true, false, null, false],
  ["EMAIL", false, true, "EMAIL", true],
  ["EMAIL", false, false, null, false],
];

describe("planContact (US-03 CA3, CA5, CA6, CA7)", () => {
  it.each(TABLE)(
    "%s, safeToContact=%s, emailIsPrivate=%s → channel %s, receipt %s",
    (preferredChannel, safeToContact, emailIsPrivate, expectedChannel, expectedReceipt) => {
      const plan = planContact({ preferredChannel, safeToContact, emailIsPrivate });

      expect(plan.channel).toBe(expectedChannel);
      expect(plan.doNotContact).toBe(expectedChannel === null);
      expect(plan.sendReceipt).toBe(expectedReceipt);
    },
  );

  it("covers every channel × safeToContact × emailIsPrivate combination", () => {
    const channels: ContactChannel[] = ["WHATSAPP", "PHONE", "EMAIL"];
    const covered = new Set(TABLE.map(([c, s, p]) => `${c}|${s}|${p}`));

    for (const channel of channels) {
      for (const safe of [true, false, null]) {
        for (const isPrivate of [true, false]) {
          expect(covered).toContain(`${channel}|${safe}|${isPrivate}`);
        }
      }
    }
  });

  it("never sends a receipt to an email that is not private (CA5)", () => {
    for (const [preferredChannel, safeToContact] of TABLE) {
      expect(
        planContact({ preferredChannel, safeToContact, emailIsPrivate: false }).sendReceipt,
      ).toBe(false);
    }
  });
});
