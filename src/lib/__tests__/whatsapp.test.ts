import { describe, expect, it } from "vitest";

import { buildWhatsAppUrl } from "@/lib/whatsapp";

describe("buildWhatsAppUrl", () => {
  it("builds a wa.me link with the encoded message", () => {
    expect(buildWhatsAppUrl("5491100000000", "Hola, quisiera hacer una consulta.")).toBe(
      "https://wa.me/5491100000000?text=Hola%2C%20quisiera%20hacer%20una%20consulta.",
    );
  });

  it("encodes accents and reserved characters", () => {
    const url = buildWhatsAppUrl("5491100000000", "¿Atención? Sí & más");

    expect(url).toBe(
      "https://wa.me/5491100000000?text=%C2%BFAtenci%C3%B3n%3F%20S%C3%AD%20%26%20m%C3%A1s",
    );
  });

  it("omits the text parameter when the message is empty", () => {
    expect(buildWhatsAppUrl("5491100000000", "   ")).toBe("https://wa.me/5491100000000");
  });

  it.each(["+5491100000000", "54 9 11 0000-0000", "123", "abc"])(
    "rejects a number that is not 8 to 15 digits: %s",
    (number) => {
      expect(() => buildWhatsAppUrl(number, "Hola")).toThrow();
    },
  );
});
