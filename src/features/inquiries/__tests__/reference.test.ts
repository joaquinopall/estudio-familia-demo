import { describe, expect, it } from "vitest";

import { toReference } from "@/features/inquiries/reference";

describe("toReference (FR-09)", () => {
  it("takes the first 8 characters of the UUID in uppercase", () => {
    expect(toReference("7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b")).toBe("C-7F3A9B21");
  });

  it("is stable for an uppercase UUID", () => {
    expect(toReference("7F3A9B21-4C5D-4E6F-8A7B-9C0D1E2F3A4B")).toBe("C-7F3A9B21");
  });

  it.each(["", "7f3a9b21", "not-a-uuid", "7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4bx"])(
    "rejects %j",
    (id) => {
      expect(() => toReference(id)).toThrow(/no es un UUID/);
    },
  );
});
