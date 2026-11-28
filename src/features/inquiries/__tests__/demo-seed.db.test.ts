/**
 * The demo-seed store against the DEVELOPMENT database (F5-08). Runs only with
 * `npm run test:db`. It never runs the seed nor deleteDemo(): those would touch the example
 * inquiries the developer may have loaded in dev. It works with one row of its own.
 */
import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { DEMO_NAME_PREFIX } from "@/features/inquiries/demo-seed";
import { createPrismaDemoSeedStore } from "@/features/inquiries/demo-seed-repository";
import { getDb } from "@/lib/db";

const RUN = randomUUID().slice(0, 8);

describe("Prisma demo-seed store (Supabase dev)", () => {
  const db = getDb();
  const store = createPrismaDemoSeedStore(db);
  const id = randomUUID();

  afterAll(async () => {
    await db.inquiry.deleteMany({ where: { id } });
    await db.$disconnect();
  });

  it("counts the inquiries whose name starts with the example prefix", async () => {
    const before = await store.countDemo();
    await db.inquiry.create({
      data: {
        id,
        fullName: `${DEMO_NAME_PREFIX}E2E-${RUN}`,
        email: `e2e-${RUN}@example.com`,
        area: "OTHER",
        urgency: "LOW",
        message: "E2E demo-seed: nunca se lee.",
        preferredChannel: "EMAIL",
        emailIsPrivate: true,
        consentAt: new Date(),
        privacyPolicyVersion: "1.2",
        events: { create: { type: "CREATED" } },
      },
    });

    expect(await store.countDemo()).toBe(before + 1);
  });

  it("finds an active staff member to act in the history", async () => {
    const staffId = await store.firstActiveStaffId();
    if (staffId === null) return; // a fresh dev database may have no staff yet

    const staff = await db.staffMember.findUniqueOrThrow({ where: { id: staffId } });
    expect(staff.active).toBe(true);
  });
});
