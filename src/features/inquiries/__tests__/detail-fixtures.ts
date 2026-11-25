/** A stored inquiry as the detail sees it, for service, handler and component tests. */
import type { InquiryDetailRow } from "@/features/inquiries/service";

export const DETAIL_ID = "7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b";
export const STAFF_ID = "5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

export function detailRow(overrides: Partial<InquiryDetailRow> = {}): InquiryDetailRow {
  return {
    id: DETAIL_ID,
    createdAt: new Date("2026-11-25T17:05:00.000Z"),
    updatedAt: new Date("2026-11-25T17:05:00.000Z"),
    fullName: "Ana Pérez",
    email: "ana@example.com",
    phone: "+54 9 11 5555-1234",
    area: "SUCCESSION",
    urgency: "HIGH",
    message: "Falleció mi papá.\nQueremos iniciar la sucesión con mis hermanos.",
    preferredChannel: "WHATSAPP",
    safeToContact: true,
    emailIsPrivate: true,
    consentAt: new Date("2026-11-25T17:05:00.000Z"),
    privacyPolicyVersion: "1.1",
    status: "NEW",
    internalNotes: null,
    source: null,
    events: [
      {
        id: "event-created",
        type: "CREATED",
        createdAt: new Date("2026-11-25T17:05:00.000Z"),
        fromStatus: null,
        toStatus: null,
        actorId: null,
        actorName: null,
      },
    ],
    ...overrides,
  };
}
