import { beforeEach, describe, expect, it } from "vitest";

import { InquiryStoreError, InvalidInquiryInputError } from "@/features/inquiries/errors";
import type { InquiryData } from "@/features/inquiries/schema";
import { createInquiryService } from "@/features/inquiries/service";
import { FixedClock } from "@/lib/ports/fakes";

import { FakeInquiryRepository, storeError } from "./fake-inquiry-repository";

const ID = "7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b";
const NOW = "2026-11-24T15:30:00.000Z";
const IP_HASH = "ab".repeat(32);

const DATA: InquiryData = {
  area: "SUCCESSION",
  urgency: "NORMAL",
  message: "Falleció mi papá y queremos iniciar la sucesión con mis hermanos.",
  fullName: "Ana Pérez",
  email: "ana@example.com",
  phone: "+54 9 11 5555-1234",
  preferredChannel: "WHATSAPP",
  safeToContact: true,
  emailIsPrivate: false,
  consent: true,
};

describe("createInquiry (FR-07, FR-09, US-07 CA2)", () => {
  let repository: FakeInquiryRepository;
  let service: ReturnType<typeof createInquiryService>;

  beforeEach(() => {
    repository = new FakeInquiryRepository(() => ID);
    service = createInquiryService({
      repository,
      clock: new FixedClock(NOW),
      privacyPolicyVersion: "1.1",
    });
  });

  it("returns the id and the readable reference", async () => {
    expect(await service.createInquiry(DATA, { ipHash: IP_HASH })).toEqual({
      id: ID,
      reference: "C-7F3A9B21",
    });
  });

  it("stores every field, the consent date from the clock and the policy version", async () => {
    await service.createInquiry(DATA, { ipHash: IP_HASH, source: "google" });

    expect(repository.inquiries).toEqual([
      {
        id: ID,
        area: "SUCCESSION",
        urgency: "NORMAL",
        message: DATA.message,
        fullName: "Ana Pérez",
        email: "ana@example.com",
        phone: "+54 9 11 5555-1234",
        preferredChannel: "WHATSAPP",
        safeToContact: true,
        emailIsPrivate: false,
        consentAt: new Date(NOW),
        privacyPolicyVersion: "1.1",
        ipHash: IP_HASH,
        source: "google",
        events: [{ type: "CREATED", actorId: null }],
      },
    ]);
  });

  it("does not store the consent checkbox itself, only its date and version", async () => {
    await service.createInquiry(DATA);
    expect(repository.inquiries[0]).not.toHaveProperty("consent");
  });

  it("keeps the nulls of an email-only inquiry", async () => {
    await service.createInquiry({
      ...DATA,
      phone: null,
      preferredChannel: "EMAIL",
      safeToContact: null,
    });

    expect(repository.inquiries[0]).toMatchObject({
      phone: null,
      preferredChannel: "EMAIL",
      safeToContact: null,
    });
  });

  describe("metadata", () => {
    it("stores null when there is no IP hash or source", async () => {
      await service.createInquiry(DATA);
      expect(repository.inquiries[0]).toMatchObject({ ipHash: null, source: null });
    });

    it.each(["203.0.113.7", "AB".repeat(32), "ab".repeat(31), ""])(
      "rejects an ipHash that is not a hash (%j), so a raw IP is never stored",
      async (ipHash) => {
        await expect(service.createInquiry(DATA, { ipHash })).rejects.toBeInstanceOf(
          InvalidInquiryInputError,
        );
        expect(repository.inquiries).toEqual([]);
      },
    );

    it.each([
      ["  instagram  ", "instagram"],
      ["   ", null],
      ["", null],
      ["a".repeat(150), "a".repeat(100)],
    ])("normalizes source %j to %j", async (source, expected) => {
      await service.createInquiry(DATA, { source });
      expect(repository.inquiries[0]?.source).toBe(expected);
    });
  });

  describe("storage errors", () => {
    it("passes InquiryStoreError through", async () => {
      const error = storeError();
      repository.failWith(error);

      await expect(service.createInquiry(DATA)).rejects.toBe(error);
    });

    it("wraps any other error in InquiryStoreError, keeping the cause", async () => {
      const cause = new Error("connection reset");
      repository.failWith(cause);

      const rejection = await service.createInquiry(DATA).catch((error: unknown) => error);
      expect(rejection).toBeInstanceOf(InquiryStoreError);
      expect((rejection as Error).cause).toBe(cause);
      expect((rejection as Error).message).not.toMatch(/ana|Pérez|connection/i);
    });
  });
});
