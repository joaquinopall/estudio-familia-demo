// @vitest-environment node
/**
 * The panel's actions (SPEC §6.5, NFR-SEC-02): UNAUTHORIZED, FORBIDDEN, VALIDATION, NOT_FOUND,
 * INTERNAL and OK, with the actor from the session and logs without personal data.
 */
import { describe, expect, it } from "vitest";

import { InquiryStoreError } from "@/features/inquiries/errors";
import { ADMIN_MESSAGES, NOTES_MAX_LENGTH } from "@/features/inquiries/schema";
import { createInquiryService } from "@/features/inquiries/service";
import { createUpdateInquiryHandlers } from "@/features/inquiries/update-inquiry";
import { type ActionResult, DEFAULT_ERROR_MESSAGES, fail, ok } from "@/lib/action-result";
import { createLogger } from "@/lib/logger";
import { FixedClock } from "@/lib/ports/fakes";

import { DETAIL_ID, STAFF_ID, detailRow } from "./detail-fixtures";
import { FakeInquiryRepository } from "./fake-inquiry-repository";

const NOTES = "Prefiere que la llamen después de las 18. Tiene audiencia el lunes.";

function setup(auth: ActionResult<{ id: string }> = ok({ id: STAFF_ID })) {
  const repository = new FakeInquiryRepository();
  repository.addDetail(detailRow());
  const logs: string[] = [];
  let refreshes = 0;
  const handlers = createUpdateInquiryHandlers({
    authorize: async () => auth,
    inquiryService: createInquiryService({
      repository,
      clock: new FixedClock(),
      privacyPolicyVersion: "1.1",
    }),
    logger: createLogger({ write: (_level, line) => logs.push(line) }),
    onChanged: () => {
      refreshes += 1;
    },
  });
  const form = (fields: Record<string, string>) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);
    return formData;
  };
  return {
    repository,
    logs,
    refreshes: () => refreshes,
    status: (fields: Record<string, string>) => handlers.updateStatus(form(fields)),
    notes: (fields: Record<string, string>) => handlers.updateNotes(form(fields)),
  };
}

const codeOf = (result: ActionResult<unknown>) => (result.ok ? "OK" : result.error.code);

describe.each([
  [
    "updateInquiryStatus",
    (ctx: ReturnType<typeof setup>) => ctx.status({ id: DETAIL_ID, status: "CLOSED" }),
  ],
  [
    "updateInquiryNotes",
    (ctx: ReturnType<typeof setup>) => ctx.notes({ id: DETAIL_ID, notes: NOTES }),
  ],
] as const)("%s: authorization comes first", (_name, run) => {
  it.each([
    ["UNAUTHORIZED", fail<{ id: string }>("UNAUTHORIZED")],
    ["FORBIDDEN", fail<{ id: string }>("FORBIDDEN")],
    ["INTERNAL", fail<{ id: string }>("INTERNAL")],
  ] as const)("returns %s without touching the inquiry", async (code, auth) => {
    const ctx = setup(auth);

    expect(codeOf(await run(ctx))).toBe(code);
    expect(ctx.repository.details.get(DETAIL_ID)?.events).toHaveLength(1);
    expect(ctx.refreshes()).toBe(0);
  });

  it("does not even validate the input without access (no probing)", async () => {
    const ctx = setup(fail("FORBIDDEN"));
    const result = await ctx.status({ id: "not-a-uuid", status: "X" });

    expect(codeOf(result)).toBe("FORBIDDEN");
  });
});

describe("updateInquiryStatus", () => {
  it("changes the status with the session's staff as actor and refreshes the page", async () => {
    const ctx = setup();

    const result = await ctx.status({ id: DETAIL_ID, status: "IN_REVIEW", actorId: "forged" });

    expect(result).toEqual({ ok: true, data: { status: "IN_REVIEW", changed: true } });
    expect(ctx.repository.details.get(DETAIL_ID)?.events.at(-1)).toMatchObject({
      type: "STATUS_CHANGED",
      fromStatus: "NEW",
      toStatus: "IN_REVIEW",
      actorId: STAFF_ID,
    });
    expect(ctx.refreshes()).toBe(1);
  });

  it("is ok without an event or a refresh for the same status", async () => {
    const ctx = setup();

    expect(await ctx.status({ id: DETAIL_ID, status: "NEW" })).toEqual({
      ok: true,
      data: { status: "NEW", changed: false },
    });
    expect(ctx.refreshes()).toBe(0);
  });

  it.each([
    [{ id: "not-a-uuid", status: "CLOSED" }, "id", ADMIN_MESSAGES.inquiryId],
    [{ id: DETAIL_ID, status: "ARCHIVED" }, "status", ADMIN_MESSAGES.status],
    [{ id: DETAIL_ID }, "status", ADMIN_MESSAGES.status],
  ])("returns VALIDATION for %j", async (fields, field, message) => {
    const result = await setup().status(fields);

    expect(result.ok === false && result.error.code).toBe("VALIDATION");
    expect(result.ok === false && result.error.fieldErrors?.[field]).toEqual([message]);
  });

  it("returns NOT_FOUND for an unknown inquiry", async () => {
    const result = await setup().status({
      id: "00000000-0000-4000-8000-000000000000",
      status: "CLOSED",
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: DEFAULT_ERROR_MESSAGES.NOT_FOUND },
    });
  });

  it("returns INTERNAL when the database fails, and logs only IDs", async () => {
    const ctx = setup();
    ctx.repository.failWith(new InquiryStoreError());

    expect(codeOf(await ctx.status({ id: DETAIL_ID, status: "CLOSED" }))).toBe("INTERNAL");
    expect(JSON.parse(ctx.logs[0] ?? "{}")).toMatchObject({
      level: "error",
      event: "inquiry.status_change_failed",
      inquiryId: DETAIL_ID,
      staffId: STAFF_ID,
      errorName: "InquiryStoreError",
    });
  });

  it("logs the change with IDs only", async () => {
    const ctx = setup();
    await ctx.status({ id: DETAIL_ID, status: "CONTACTED" });

    expect(JSON.parse(ctx.logs[0] ?? "{}")).toMatchObject({
      event: "inquiry.status_changed",
      inquiryId: DETAIL_ID,
      staffId: STAFF_ID,
    });
  });
});

describe("updateInquiryNotes", () => {
  it("saves trimmed notes, refreshes and never logs the text", async () => {
    const ctx = setup();

    const result = await ctx.notes({ id: DETAIL_ID, notes: `  ${NOTES}  ` });

    expect(result.ok && result.data.changed).toBe(true);
    expect(ctx.repository.details.get(DETAIL_ID)?.internalNotes).toBe(NOTES);
    expect(ctx.refreshes()).toBe(1);
    expect(ctx.logs.join("\n")).not.toContain("audiencia");
  });

  it("clears the notes when the field is emptied", async () => {
    const ctx = setup();
    await ctx.notes({ id: DETAIL_ID, notes: NOTES });

    await ctx.notes({ id: DETAIL_ID, notes: "   " });

    expect(ctx.repository.details.get(DETAIL_ID)?.internalNotes).toBeNull();
  });

  it("is ok without an event when nothing changed", async () => {
    const ctx = setup();

    const result = await ctx.notes({ id: DETAIL_ID, notes: "" });

    expect(result.ok && result.data.changed).toBe(false);
    expect(ctx.refreshes()).toBe(0);
  });

  it("rejects notes over 5000 characters and gives the text back", async () => {
    const tooLong = "x".repeat(NOTES_MAX_LENGTH + 1);

    const result = await setup().notes({ id: DETAIL_ID, notes: tooLong });

    expect(result.ok === false && result.error.fieldErrors?.notes).toEqual([
      ADMIN_MESSAGES.notesTooLong,
    ]);
    expect(result.values).toEqual({ notes: tooLong });
  });

  it("gives the text back on NOT_FOUND and INTERNAL too", async () => {
    const ctx = setup();
    const missing = await ctx.notes({ id: "00000000-0000-4000-8000-000000000000", notes: NOTES });
    ctx.repository.failWith(new InquiryStoreError());
    const failed = await ctx.notes({ id: DETAIL_ID, notes: NOTES });

    expect(codeOf(missing)).toBe("NOT_FOUND");
    expect(codeOf(failed)).toBe("INTERNAL");
    expect(failed.values).toEqual({ notes: NOTES });
    expect(ctx.logs.join("\n")).not.toContain("audiencia");
  });

  it("returns no values on success", async () => {
    expect((await setup().notes({ id: DETAIL_ID, notes: NOTES })).values).toBeUndefined();
  });
});
