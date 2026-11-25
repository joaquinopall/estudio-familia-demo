// @vitest-environment node
/** getInquiry, changeStatus and updateNotes (US-06 CA3, FR-11, FR-12). */
import { describe, expect, it } from "vitest";

import { createInquiryService } from "@/features/inquiries/service";
import { FixedClock } from "@/lib/ports/fakes";

import { DETAIL_ID, STAFF_ID, detailRow } from "./detail-fixtures";
import { FakeInquiryRepository } from "./fake-inquiry-repository";

function setup(row = detailRow()) {
  const repository = new FakeInquiryRepository();
  repository.addDetail(row);
  repository.staffNames.set(STAFF_ID, "Laura Gómez");
  const service = createInquiryService({
    repository,
    clock: new FixedClock(),
    privacyPolicyVersion: "1.1",
  });
  return { repository, service };
}

describe("getInquiry", () => {
  it("returns every field, the reference and the history, never the ipHash", async () => {
    const detail = await setup().service.getInquiry(DETAIL_ID);

    expect(detail).toMatchObject({
      id: DETAIL_ID,
      reference: "C-7F3A9B21",
      fullName: "Ana Pérez",
      message: "Falleció mi papá.\nQueremos iniciar la sucesión con mis hermanos.",
      history: [{ type: "CREATED", actor: { type: "website" } }],
    });
    expect(detail).not.toHaveProperty("ipHash");
    expect(detail).not.toHaveProperty("events");
  });

  it("returns null for an unknown id", async () => {
    expect(await setup().service.getInquiry("00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it.each([
    ["WhatsApp, safe", { preferredChannel: "WHATSAPP", safeToContact: true }, "WHATSAPP", false],
    [
      "WhatsApp not safe, private email",
      { safeToContact: false, emailIsPrivate: true },
      "EMAIL",
      false,
    ],
    [
      "phone not safe, shared email",
      { preferredChannel: "PHONE", safeToContact: false, emailIsPrivate: false },
      null,
      true,
    ],
  ] as const)(
    "plans the contact with planContact: %s",
    async (_case, fields, channel, doNotContact) => {
      const detail = await setup(detailRow(fields)).service.getInquiry(DETAIL_ID);

      expect(detail).toMatchObject({ contactChannel: channel, doNotContact });
    },
  );

  it("names staff actors, and keeps an unknown member as an unnamed staff", async () => {
    const { service } = setup(
      detailRow({
        events: [
          ...detailRow().events,
          {
            id: "e2",
            type: "NOTES_UPDATED",
            createdAt: new Date(),
            fromStatus: null,
            toStatus: null,
            actorId: STAFF_ID,
            actorName: "Laura Gómez",
          },
          {
            id: "e3",
            type: "NOTES_UPDATED",
            createdAt: new Date(),
            fromStatus: null,
            toStatus: null,
            actorId: "gone",
            actorName: null,
          },
        ],
      }),
    );

    const detail = await service.getInquiry(DETAIL_ID);

    expect(detail?.history.map((entry) => entry.actor)).toEqual([
      { type: "website" },
      { type: "staff", name: "Laura Gómez" },
      { type: "staff", name: null },
    ]);
  });
});

describe("changeStatus (FR-11, FR-12)", () => {
  it("changes to any other status and records from, to and the actor", async () => {
    const { service, repository } = setup();

    expect(await service.changeStatus(DETAIL_ID, "DISCARDED", STAFF_ID)).toEqual({
      result: "changed",
      from: "NEW",
      to: "DISCARDED",
    });
    expect(repository.details.get(DETAIL_ID)?.events.at(-1)).toMatchObject({
      type: "STATUS_CHANGED",
      fromStatus: "NEW",
      toStatus: "DISCARDED",
      actorId: STAFF_ID,
    });
  });

  it("does nothing for the same status: no event", async () => {
    const { service, repository } = setup();

    expect(await service.changeStatus(DETAIL_ID, "NEW", STAFF_ID)).toEqual({ result: "unchanged" });
    expect(repository.details.get(DETAIL_ID)?.events).toHaveLength(1);
  });

  it("reports an unknown inquiry", async () => {
    expect(await setup().service.changeStatus("nope", "CLOSED", STAFF_ID)).toEqual({
      result: "not_found",
    });
  });
});

describe("updateNotes (FR-12)", () => {
  it("saves the notes and records who and when, never the text", async () => {
    const { service, repository } = setup();

    const result = await service.updateNotes(DETAIL_ID, "Llamar después de las 18.", STAFF_ID);

    expect(result.result).toBe("changed");
    const stored = repository.details.get(DETAIL_ID);
    expect(stored?.internalNotes).toBe("Llamar después de las 18.");
    expect(stored?.events.at(-1)).toMatchObject({ type: "NOTES_UPDATED", actorId: STAFF_ID });
    expect(JSON.stringify(stored?.events)).not.toContain("Llamar");
  });

  it("clears the notes with null", async () => {
    const { service, repository } = setup(detailRow({ internalNotes: "viejo" }));

    await service.updateNotes(DETAIL_ID, null, STAFF_ID);

    expect(repository.details.get(DETAIL_ID)?.internalNotes).toBeNull();
  });

  it("does nothing when the notes did not change", async () => {
    const { service, repository } = setup(detailRow({ internalNotes: "igual" }));

    expect((await service.updateNotes(DETAIL_ID, "igual", STAFF_ID)).result).toBe("unchanged");
    expect(repository.details.get(DETAIL_ID)?.events).toHaveLength(1);
  });

  it("reports an unknown inquiry", async () => {
    expect((await setup().service.updateNotes("nope", "x", STAFF_ID)).result).toBe("not_found");
  });
});
