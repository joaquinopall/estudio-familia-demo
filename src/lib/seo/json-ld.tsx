/**
 * Safe JSON-LD rendering (FR-14, CLAUDE.md §5). This is the ONLY place in the project allowed
 * to use dangerouslySetInnerHTML.
 *
 * JSON.stringify alone is not safe inside <script>: a string value containing "</script>"
 * would close the tag and let the rest run as HTML. Escaping "<", ">" and "&" as Unicode
 * escapes keeps the JSON valid (JSON.parse returns the same value) while making it impossible
 * to break out of the element. U+2028/U+2029 are escaped too (line terminators in old JS).
 */

export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonLdValue[]
  | { readonly [key: string]: JsonLdValue | undefined };

export type JsonLdObject = { readonly [key: string]: JsonLdValue | undefined };

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/** Each unsafe character and its JSON Unicode escape (backslash + "u003c" for "<", etc.). */
const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LINE_SEPARATOR]: "\\u2028",
  [PARAGRAPH_SEPARATOR]: "\\u2029",
};

const UNSAFE_CHARS = new RegExp(`[<>&${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`, "g");

export function serializeJsonLd(data: JsonLdObject | readonly JsonLdObject[]): string {
  return JSON.stringify(data).replace(UNSAFE_CHARS, (char) => ESCAPES[char] ?? char);
}

type JsonLdProps = { data: JsonLdObject | readonly JsonLdObject[] };

/** Renders structured data as a non-executable script (not affected by the CSP script-src). */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // Safe: serialized with serializeJsonLd (see above). The only allowed use in the project.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
