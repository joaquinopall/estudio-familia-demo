import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JsonLd, serializeJsonLd } from "@/lib/seo/json-ld";

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

describe("serializeJsonLd (CLAUDE.md §5)", () => {
  it("cannot close the <script> element, even with hostile content", () => {
    const hostile = { name: "</script><script>alert(1)</script>", note: "a & b > c" };
    const output = serializeJsonLd(hostile);

    expect(output).not.toMatch(/[<>&]/);
    expect(output).toContain("\\u003c/script\\u003e");
  });

  it("escapes the U+2028 and U+2029 line terminators", () => {
    const output = serializeJsonLd({ text: `a${LINE_SEPARATOR}b${PARAGRAPH_SEPARATOR}c` });

    expect(output).not.toContain(LINE_SEPARATOR);
    expect(output).not.toContain(PARAGRAPH_SEPARATOR);
    expect(output).toContain("\\u2028");
    expect(output).toContain("\\u2029");
  });

  it("keeps the JSON equivalent: parsing returns the original value", () => {
    const data = {
      "@type": "Question",
      name: "¿<b>Qué</b> pasa & cómo?",
      text: `x${LINE_SEPARATOR}y`,
      list: [1, true, null],
    };

    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it("serializes arrays of nodes", () => {
    expect(JSON.parse(serializeJsonLd([{ a: 1 }, { b: 2 }]))).toEqual([{ a: 1 }, { b: 2 }]);
  });
});

describe("JsonLd", () => {
  it("renders a parseable application/ld+json script", () => {
    const { container } = render(<JsonLd data={{ "@type": "Thing", name: "</script>" }} />);

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(JSON.parse(script?.textContent ?? "")).toEqual({ "@type": "Thing", name: "</script>" });
    expect(container.querySelectorAll("script")).toHaveLength(1);
  });
});
