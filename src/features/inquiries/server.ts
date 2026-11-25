/**
 * Composition of the inquiry service with its real dependencies (Prisma, system clock and the
 * current privacy policy), for Server Components and Server Actions. Tests build the service
 * with fakes instead (service.ts).
 */
import "server-only";

import { privacyPolicy } from "@/content/legal/privacy";
import { getClock } from "@/lib/adapters";
import { getDb } from "@/lib/db";

import { createPrismaInquiryRepository } from "./repository";
import { type InquiryService, createInquiryService } from "./service";

export function getInquiryService(): InquiryService {
  return createInquiryService({
    repository: createPrismaInquiryRepository(getDb()),
    clock: getClock(),
    privacyPolicyVersion: privacyPolicy.version,
  });
}
