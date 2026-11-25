/**
 * Domain types of an inquiry (SPEC §7, §16).
 *
 * The enum values are defined here and not imported from the generated Prisma client: the
 * schema also runs in the browser (FR-05) and services must not know Prisma (ADR-0001).
 * `__tests__/enums.test.ts` checks that they match prisma/schema.prisma.
 */

export const PRACTICE_AREAS = [
  "SUCCESSION",
  "DIVORCE",
  "CHILD_SUPPORT",
  "PARENTING",
  "AGREEMENTS",
  "OTHER",
] as const;
export type PracticeArea = (typeof PRACTICE_AREAS)[number];

export const URGENCIES = ["LOW", "NORMAL", "HIGH"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const CONTACT_CHANNELS = ["WHATSAPP", "PHONE", "EMAIL"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const INQUIRY_STATUSES = ["NEW", "IN_REVIEW", "CONTACTED", "CLOSED", "DISCARDED"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

/** Channels that ring a phone, where safeToContact must be asked (US-03 CA6). */
export const PHONE_CHANNELS = ["PHONE", "WHATSAPP"] as const satisfies readonly ContactChannel[];

export const isPhoneChannel = (channel: ContactChannel): boolean =>
  (PHONE_CHANNELS as readonly ContactChannel[]).includes(channel);

/** One row of the panel list (US-06 CA2). No message or phone: they belong to the detail. */
export type InquirySummary = {
  id: string;
  reference: string;
  createdAt: Date;
  fullName: string;
  email: string;
  area: PracticeArea;
  urgency: Urgency;
  status: InquiryStatus;
  preferredChannel: ContactChannel;
  /** No safe channel: the firm must not start contact (US-03 CA7). */
  doNotContact: boolean;
};

/** A page of the panel list. `page` is the one actually shown (out-of-range requests clamp). */
export type InquiryPage = {
  items: InquirySummary[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
};
