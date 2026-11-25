/**
 * Business rules of inquiries (SPEC §6.1, CLAUDE.md §3). Pure: no Next, no Prisma, no SDKs.
 * Dependencies come in through the factory, so tests use fakes (SPEC §13).
 *
 * F3-04: createInquiry. F4-04: listInquiries. getInquiry, changeStatus and updateNotes: F4-05.
 */
import type { Clock } from "@/lib/ports/clock";

import { planContact } from "./contact-safety";
import { InquiryStoreError, InvalidInquiryInputError } from "./errors";
import { toReference } from "./reference";
import { INQUIRIES_PAGE_SIZE, type InquiryData, type ListFilters } from "./schema";
import type { InquiryPage, InquiryStatus, InquirySummary, PracticeArea, Urgency } from "./types";

/** What gets stored for a new inquiry. The consent checkbox becomes its date and version. */
export type NewInquiryRecord = Omit<InquiryData, "consent"> & {
  consentAt: Date;
  privacyPolicyVersion: string;
  /** HMAC-SHA256 of the IP (NFR-SEC-06), never the IP itself. */
  ipHash: string | null;
  /** utm_source or origin of the inquiry, at most 100 characters. */
  source: string | null;
};

/** Filters and window of a list query; the repository turns them into SQL. */
export type InquiryListQuery = {
  status?: InquiryStatus;
  area?: PracticeArea;
  urgency?: Urgency;
  /** Part of the name or the email, case-insensitive. */
  search?: string;
  skip: number;
  take: number;
};

/** The stored fields the list needs, before the service derives the rest. */
export type InquiryListRow = Omit<InquirySummary, "reference" | "doNotContact"> & {
  safeToContact: boolean | null;
  emailIsPrivate: boolean;
};

/**
 * What the service needs from storage. Implemented by repository.ts (Prisma) and by an
 * in-memory fake in tests. Must store the inquiry and its CREATED event atomically (FR-07),
 * and throw InquiryStoreError if it cannot.
 */
export interface InquiryRepository {
  createWithCreatedEvent(record: NewInquiryRecord): Promise<{ id: string }>;
  /** Newest first (createdAt desc, then id desc), with the total that matches the filters. */
  list(query: InquiryListQuery): Promise<{ rows: InquiryListRow[]; total: number }>;
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

/** Adds what the list shows but is not stored: the reference and the safe-contact verdict. */
function toSummary({ safeToContact, emailIsPrivate, ...row }: InquiryListRow): InquirySummary {
  return {
    ...row,
    reference: toReference(row.id),
    // planContact is the only source of the safe-contact rule (SPEC §8.1).
    doNotContact: planContact({
      preferredChannel: row.preferredChannel,
      safeToContact,
      emailIsPrivate,
    }).doNotContact,
  };
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

    /**
     * One page of the panel list (US-06 CA2), newest first. A page past the end shows the last
     * one instead of an empty table (a shared link may be older than a deletion).
     */
    async listInquiries(filters: ListFilters): Promise<InquiryPage> {
      const pageSize = INQUIRIES_PAGE_SIZE;
      const where = {
        status: filters.status,
        area: filters.area,
        urgency: filters.urgency,
        search: filters.q,
      };
      const fetchPage = (page: number) =>
        repository.list({ ...where, skip: (page - 1) * pageSize, take: pageSize });

      let page = filters.page;
      let { rows, total } = await fetchPage(page);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (page > totalPages) {
        page = totalPages;
        ({ rows, total } = await fetchPage(page));
      }

      return { items: rows.map(toSummary), total, page, totalPages, pageSize };
    },
  };
}

export type InquiryService = ReturnType<typeof createInquiryService>;
