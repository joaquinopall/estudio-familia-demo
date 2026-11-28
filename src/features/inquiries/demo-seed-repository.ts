/**
 * Storage of `npm run demo:seed` (F5-08, demo-seed.ts) with Prisma: finds and deletes the
 * example inquiries by their name prefix, and picks the staff member that acts in their
 * history. The inquiries themselves are created through the regular repository (encrypted).
 */
import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

import { DEMO_NAME_PREFIX, type DemoSeedStore } from "./demo-seed";

export function createPrismaDemoSeedStore(db: PrismaClient): DemoSeedStore {
  const isDemo = { fullName: { startsWith: DEMO_NAME_PREFIX } };
  return {
    countDemo: () => db.inquiry.count({ where: isDemo }),
    async firstActiveStaffId() {
      const staff = await db.staffMember.findFirst({
        where: { active: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      return staff?.id ?? null;
    },
    async deleteDemo() {
      // Events go with their inquiry (onDelete: Cascade, SPEC §7).
      const { count } = await db.inquiry.deleteMany({ where: isDemo });
      return count;
    },
  };
}
