// @vitest-environment node
/** listInquiries (US-06 CA2): pagination, filters and what each row shows. */
import { describe, expect, it } from "vitest";

import { INQUIRIES_PAGE_SIZE, listFiltersSchema } from "@/features/inquiries/schema";
import { type InquiryListRow, createInquiryService } from "@/features/inquiries/service";
import { FixedClock } from "@/lib/ports/fakes";

import { FakeInquiryRepository } from "./fake-inquiry-repository";

/** n rows, one minute apart: index 0 is the oldest. ids end in the index, zero-padded. */
function rows(n: number, overrides: Partial<InquiryListRow> = {}): InquiryListRow[] {
  return Array.from({ length: n }, (_, index) => ({
    id: `7f3a9b21-4c5d-4e6f-8a7b-${String(index).padStart(12, "0")}`,
    createdAt: new Date(Date.UTC(2026, 10, 25, 12, index)),
    fullName: `Persona ${index}`,
    email: `persona${index}@example.com`,
    area: "SUCCESSION",
    urgency: "NORMAL",
    status: "NEW",
    preferredChannel: "WHATSAPP",
    safeToContact: true,
    emailIsPrivate: true,
    ...overrides,
  }));
}

function setup(seed: InquiryListRow[] = []) {
  const repository = new FakeInquiryRepository();
  repository.listRows.push(...seed);
  const service = createInquiryService({
    repository,
    clock: new FixedClock(),
    privacyPolicyVersion: "1.1",
  });
  return {
    repository,
    list: (params: Record<string, string> = {}) =>
      service.listInquiries(listFiltersSchema.parse(params)),
  };
}

describe("listInquiries", () => {
  it("returns 20 per page, newest first, with the totals", async () => {
    const { list } = setup(rows(45));

    const result = await list();

    expect(result).toMatchObject({ total: 45, page: 1, totalPages: 3, pageSize: 20 });
    expect(result.items).toHaveLength(INQUIRIES_PAGE_SIZE);
    expect(result.items[0]?.fullName).toBe("Persona 44");
    expect(result.items[19]?.fullName).toBe("Persona 25");
  });

  it("asks the repository for the right window of each page", async () => {
    const { list, repository } = setup(rows(45));

    const third = await list({ page: "3" });

    expect(repository.listQueries.at(-1)).toMatchObject({ skip: 40, take: 20 });
    expect(third.items.map((item) => item.fullName)).toEqual([
      "Persona 4",
      "Persona 3",
      "Persona 2",
      "Persona 1",
      "Persona 0",
    ]);
  });

  it("shows the last page when the requested one is past the end (an old shared link)", async () => {
    const { list } = setup(rows(25));

    const result = await list({ page: "9" });

    expect(result.page).toBe(2);
    expect(result.items).toHaveLength(5);
  });

  it("with no inquiries: page 1 of 1, empty", async () => {
    expect(await setup().list({ page: "4" })).toMatchObject({
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
    });
  });

  it("passes every filter and the search to the repository", async () => {
    const { list, repository } = setup();

    await list({ status: "IN_REVIEW", area: "DIVORCE", urgency: "HIGH", q: "  pérez " });

    expect(repository.listQueries[0]).toEqual({
      status: "IN_REVIEW",
      area: "DIVORCE",
      urgency: "HIGH",
      search: "pérez",
      skip: 0,
      take: 20,
    });
  });

  it("ignores invalid filters from an edited URL instead of failing", async () => {
    const { list, repository } = setup(rows(3));

    const result = await list({ status: "HACKED", area: "x", page: "-2" });

    expect(result.total).toBe(3);
    expect(repository.listQueries[0]).toMatchObject({
      status: undefined,
      area: undefined,
      skip: 0,
    });
  });

  it("adds the readable reference to each row", async () => {
    const [first] = (await setup(rows(1)).list()).items;

    expect(first?.reference).toBe("C-7F3A9B21");
  });

  it.each([
    [
      "WhatsApp, safe",
      { preferredChannel: "WHATSAPP", safeToContact: true, emailIsPrivate: false },
      false,
    ],
    [
      "WhatsApp not safe, private email",
      { preferredChannel: "WHATSAPP", safeToContact: false, emailIsPrivate: true },
      false,
    ],
    [
      "phone not safe, shared email",
      { preferredChannel: "PHONE", safeToContact: false, emailIsPrivate: false },
      true,
    ],
    [
      "email that is not private",
      { preferredChannel: "EMAIL", safeToContact: null, emailIsPrivate: false },
      true,
    ],
  ] as const)(
    "marks %s with doNotContact=%s (US-03 CA7, planContact)",
    async (_case, fields, expected) => {
      const [item] = (await setup(rows(1, fields)).list()).items;

      expect(item?.doNotContact).toBe(expected);
      expect(item).not.toHaveProperty("safeToContact");
      expect(item).not.toHaveProperty("emailIsPrivate");
    },
  );

  it("lets a database error reach the page (it shows the panel's error message)", async () => {
    const { list, repository } = setup();
    repository.failWith(new Error("db down"));

    await expect(list()).rejects.toThrow("db down");
  });
});
