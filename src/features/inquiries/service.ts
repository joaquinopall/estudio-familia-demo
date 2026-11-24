/**
 * Business rules of inquiries (SPEC §6.1, CLAUDE.md §3). Pure: no Next, no Prisma, no SDKs.
 * Dependencies come in through the factory, so tests use fakes (SPEC §13).
 *
 * F3-04: createInquiry. listInquiries, getInquiry, changeStatus and updateNotes come in F4.
 */
import type { Clock } from "@/lib/ports/clock";

import { InquiryStoreError, InvalidInquiryInputError } from "./errors";
import { toReference } from "./reference";
import type { InquiryData } from "./schema";

/** What gets stored for a new inquiry. The consent checkbox becomes its date and version. */
export type NewInquiryRecord = Omit<InquiryData, "consent"> & {
  consentAt: Date;
  privacyPolicyVersion: string;
  /** HMAC-SHA256 of the IP (NFR-SEC-06), never the IP itself. */
  ipHash: string | null;
  /** utm_source or origin of the inquiry, at most 100 characters. */
  source: string | null;
};

/**
 * What the service needs from storage. Implemented by repository.ts (Prisma) and by an
 * in-memory fake in tests. Must store the inquiry and its CREATED event atomically (FR-07),
 * and throw InquiryStoreError if it cannot.
 */
export interface InquiryRepository {
  createWithCreatedEvent(record: NewInquiryRecord): Promise<{ id: string }>;
}

export type InquiryServiceDeps = {
  repository: InquiryRepository;
  clock: Clock;
  /** Version of the privacy policy shown in the form (content/legal/privacy.ts). */
  privacyPolicyVersion: string;
};

export type CreateInquiryMeta = {
  ipHash?: string | null;
  source?: string | null;
};

export type CreatedInquiry = { id: string; reference: string };

export const SOURCE_MAX_LENGTH = 100;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

function normalizeIpHash(ipHash: string | null | undefined): string | null {
  if (ipHash === null || ipHash === undefined) return null;
  if (!HASH_PATTERN.test(ipHash)) {
    throw new InvalidInquiryInputError(
      "ipHash tiene que ser un hash hexadecimal de 64 caracteres.",
    );
  }
  return ipHash;
}

function normalizeSource(source: string | null | undefined): string | null {
  const trimmed = source?.trim().slice(0, SOURCE_MAX_LENGTH).trim();
  return trimmed ? trimmed : null;
}

export function createInquiryService({
  repository,
  clock,
  privacyPolicyVersion,
}: InquiryServiceDeps) {
  return {
    /**
     * Stores a validated inquiry (from inquirySchema) with its CREATED event, and returns its
     * id and readable reference (FR-07, FR-09, US-07 CA2).
     */
    async createInquiry(data: InquiryData, meta: CreateInquiryMeta = {}): Promise<CreatedInquiry> {
      // Field by field on purpose: only these values reach the database. `consent` is not
      // stored as such: it becomes consentAt and privacyPolicyVersion (US-07 CA2).
      const record: NewInquiryRecord = {
        area: data.area,
        urgency: data.urgency,
        message: data.message,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        preferredChannel: data.preferredChannel,
        safeToContact: data.safeToContact,
        emailIsPrivate: data.emailIsPrivate,
        consentAt: clock.now(),
        privacyPolicyVersion,
        ipHash: normalizeIpHash(meta.ipHash),
        source: normalizeSource(meta.source),
      };

      let id: string;
      try {
        ({ id } = await repository.createWithCreatedEvent(record));
      } catch (error) {
        throw error instanceof InquiryStoreError ? error : new InquiryStoreError({ cause: error });
      }
      return { id, reference: toReference(id) };
    },
  };
}

export type InquiryService = ReturnType<typeof createInquiryService>;
