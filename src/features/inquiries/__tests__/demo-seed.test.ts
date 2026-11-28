import { describe, expect, it } from "vitest";

import {
  DEMO_NAME_PREFIX,
  type DemoSeedStore,
  STATUS_PATH,
  buildDemoInquiries,
  parseDemoSeedArgs,
  runDemoSeed,
} from "@/features/inquiries/demo-seed";
import { inquirySchema } from "@/features/inquiries/schema";
import type { InquiryRepository, NewInquiryRecord } from "@/features/inquiries/service";
import type { InquiryStatus } from "@/features/inquiries/types";
import { planContact } from "@/features/inquiries/contact-safety";

const NOW = new Date("2026-11-28T12:00:00.000Z");
const examples = buildDemoInquiries(NOW, "1.2");

/** Records what the seed does; only the methods it uses. */
class RecordingRepository implements InquiryRepository {
  readonly created: NewInquiryRecord[] = [];
  readonly status = new Map<string, InquiryStatus>();
  readonly notes = new Map<string, string | null>();
  readonly actors = new Set<string>();

  async createWithCreatedEvent(record: NewInquiryRecord) {
    const id = `id-${this.created.length + 1}`;
    this.created.push(record);
    this.status.set(id, "NEW");
    return { id };
  }
  async updateStatus(id: string, status: InquiryStatus, actorId: string) {
    const from = this.status.get(id) ?? "NEW";
    this.status.set(id, status);
    this.actors.add(actorId);
    return { result: "changed" as const, from, to: status };
  }
  async updateNotes(id: string, notes: string | null, actorId: string) {
    this.notes.set(id, notes);
    this.actors.add(actorId);
    return { result: "changed" as const, updatedAt: NOW };
  }
  list(): never {
    throw new Error("not used");
  }
  findById(): never {
    throw new Error("not used");
  }
}

class MemoryDemoStore implements DemoSeedStore {
  deleted = 0;
  constructor(
    private existing = 0,
    private staffId: string | null = "staff-1",
  ) {}
  async countDemo() {
    return this.existing;
  }
  async firstActiveStaffId() {
    return this.staffId;
  }
  async deleteDemo() {
    this.deleted = this.existing;
    this.existing = 0;
    return this.deleted;
  }
}

const deps = (overrides: Partial<Parameters<typeof runDemoSeed>[0]> = {}) => ({
  repository: new RecordingRepository(),
  store: new MemoryDemoStore(),
  now: NOW,
  privacyPolicyVersion: "1.2",
  demoMode: true,
  ...overrides,
});

describe("buildDemoInquiries (F5-08)", () => {
  it("has eight inquiries, all marked as fictitious", () => {
    expect(examples).toHaveLength(8);
    for (const { record } of examples) {
      expect(record.fullName.startsWith(DEMO_NAME_PREFIX)).toBe(true);
      expect(record.email).toMatch(/@example\.com$/);
      expect(record.message.startsWith("(Ejemplo)")).toBe(true);
      expect(record.source).toBe("demo-seed");
      expect(record.ipHash).toBeNull();
    }
  });

  it("covers every area, urgency, status and channel, and a 'No iniciar contacto'", () => {
    const set = <T>(values: T[]) => new Set(values);
    expect(set(examples.map((e) => e.record.area)).size).toBe(6);
    expect(set(examples.map((e) => e.record.urgency)).size).toBe(3);
    expect(set(examples.map((e) => e.status)).size).toBe(5);
    expect(set(examples.map((e) => e.record.preferredChannel)).size).toBe(3);
    expect(examples.some((e) => planContact(e.record).doNotContact)).toBe(true);
  });

  it("would pass the form's own validation (the name prefix aside)", () => {
    for (const { record } of examples) {
      // What the form sends: strings, as in a FormData.
      const parsed = inquirySchema.safeParse({
        area: record.area,
        urgency: record.urgency,
        message: record.message,
        fullName: record.fullName.slice(DEMO_NAME_PREFIX.length),
        email: record.email,
        phone: record.phone ?? undefined,
        preferredChannel: record.preferredChannel,
        safeToContact: record.safeToContact === null ? undefined : String(record.safeToContact),
        emailIsPrivate: String(record.emailIsPrivate),
        consent: "on",
      });
      expect(parsed.success, record.fullName).toBe(true);
    }
  });

  it("uses fictitious phone numbers", () => {
    for (const { record } of examples) {
      if (record.phone) expect(record.phone).toMatch(/^\+54 9 11 0000-00\d{2}$/);
    }
  });
});

describe("runDemoSeed", () => {
  it("refuses outside demo mode, whatever the mode: never into a real firm's database", async () => {
    for (const mode of ["dry", "apply", "remove"] as const) {
      const d = deps({ demoMode: false });
      expect(await runDemoSeed(d, mode)).toEqual({ status: "refused_not_demo" });
      expect((d.repository as RecordingRepository).created).toEqual([]);
    }
  });

  it("only says what it would do in a dry run", async () => {
    const d = deps();
    expect(await runDemoSeed(d, "dry")).toEqual({ status: "planned", count: 8 });
    expect((d.repository as RecordingRepository).created).toEqual([]);
  });

  it("creates the eight with their history and notes, through the repository", async () => {
    const d = deps();
    const repository = d.repository as RecordingRepository;

    expect(await runDemoSeed(d, "apply")).toEqual({ status: "seeded", count: 8 });

    expect(repository.created).toHaveLength(8);
    expect([...repository.status.values()].sort()).toEqual(examples.map((e) => e.status).sort());
    expect(repository.notes.size).toBe(examples.filter((e) => e.notes).length);
    expect([...repository.actors]).toEqual(["staff-1"]);
  });

  it("is idempotent: adds nothing if example inquiries already exist", async () => {
    const d = deps({ store: new MemoryDemoStore(8) });

    expect(await runDemoSeed(d, "apply")).toEqual({ status: "already_seeded", existing: 8 });
    expect((d.repository as RecordingRepository).created).toEqual([]);
  });

  it("needs an active staff member as the actor of the history", async () => {
    const d = deps({ store: new MemoryDemoStore(0, null) });

    expect(await runDemoSeed(d, "apply")).toEqual({ status: "no_staff" });
    expect((d.repository as RecordingRepository).created).toEqual([]);
  });

  it("removes the example inquiries with --remove", async () => {
    const store = new MemoryDemoStore(8);
    expect(await runDemoSeed(deps({ store }), "remove")).toEqual({ status: "removed", count: 8 });
  });

  it("follows the panel's transitions to reach each status", () => {
    expect(STATUS_PATH.CLOSED).toEqual(["IN_REVIEW", "CONTACTED", "CLOSED"]);
    expect(STATUS_PATH.NEW).toEqual([]);
  });
});

describe("parseDemoSeedArgs", () => {
  it.each([
    [[], "dry"],
    [["--confirm"], "apply"],
    [["--remove"], "remove"],
  ] as const)("%j → %s", (argv, mode) => {
    expect(parseDemoSeedArgs(argv)).toEqual({ status: "ok", mode });
  });

  it("rejects typos and both flags at once", () => {
    expect(parseDemoSeedArgs(["--confrim"])).toMatchObject({ status: "error" });
    expect(parseDemoSeedArgs(["--confirm", "--remove"])).toMatchObject({ status: "error" });
  });
});
