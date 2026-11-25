/**
 * Logic of the panel's Server Actions: change the status and save the internal notes
 * (US-06 CA3, FR-11, FR-12, SPEC §6.5, NFR-SEC-02). Dependencies come in as parameters, so
 * every branch is tested with fakes; actions.ts wires the real ones.
 *
 * Order: authorization first (requireStaffForAction: nobody without access learns anything,
 * not even whether an id is valid) → validation → service → ActionResult.
 * The actor is always the staff member of the session, never a form field.
 */
import { type ActionResult, fail, ok, validationFailure } from "@/lib/action-result";
import type { Logger } from "@/lib/logger";

import { updateNotesSchema, updateStatusSchema } from "./schema";
import type { InquiryService } from "./service";
import type { InquiryStatus } from "./types";

export type UpdateStatusOutput = { status: InquiryStatus; changed: boolean };
export type UpdateNotesOutput = { updatedAt: Date; changed: boolean };

export type UpdateStatusState = ActionResult<UpdateStatusOutput> | null;
/** On failure it carries the typed notes back, so a rejected save loses nothing. */
export type UpdateNotesResult = ActionResult<UpdateNotesOutput> & { values?: { notes: string } };
export type UpdateNotesState = UpdateNotesResult | null;

export type UpdateInquiryDeps = {
  /** requireStaffForAction(): the staff member, or UNAUTHORIZED / FORBIDDEN / INTERNAL. */
  authorize: () => Promise<ActionResult<{ id: string }>>;
  inquiryService: Pick<InquiryService, "changeStatus" | "updateNotes">;
  logger: Logger;
  /** Called only when something changed: refreshes the page (next/cache refresh()). */
  onChanged: () => void;
};

const fieldOf = (formData: FormData, name: string): string | undefined => {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
};

export function createUpdateInquiryHandlers(deps: UpdateInquiryDeps) {
  const { logger } = deps;

  async function updateStatus(formData: FormData): Promise<ActionResult<UpdateStatusOutput>> {
    const auth = await deps.authorize();
    if (!auth.ok) return auth;

    const parsed = updateStatusSchema.safeParse({
      id: fieldOf(formData, "id"),
      status: fieldOf(formData, "status"),
    });
    if (!parsed.success) return validationFailure(parsed.error);
    const { id, status } = parsed.data;
    const context = { inquiryId: id, staffId: auth.data.id };

    let outcome;
    try {
      outcome = await deps.inquiryService.changeStatus(id, status, auth.data.id);
    } catch (error) {
      logger.error("inquiry.status_change_failed", { ...context, error });
      return fail("INTERNAL");
    }

    switch (outcome.result) {
      case "not_found":
        return fail("NOT_FOUND");
      case "unchanged":
        return ok({ status, changed: false });
      case "changed":
        logger.info("inquiry.status_changed", context);
        deps.onChanged();
        return ok({ status, changed: true });
    }
  }

  async function updateNotesOnly(formData: FormData): Promise<ActionResult<UpdateNotesOutput>> {
    const auth = await deps.authorize();
    if (!auth.ok) return auth;

    const parsed = updateNotesSchema.safeParse({
      id: fieldOf(formData, "id"),
      notes: fieldOf(formData, "notes") ?? "",
    });
    if (!parsed.success) return validationFailure(parsed.error);
    const { id, notes } = parsed.data;
    const context = { inquiryId: id, staffId: auth.data.id };

    let outcome;
    try {
      outcome = await deps.inquiryService.updateNotes(id, notes, auth.data.id);
    } catch (error) {
      // Never the notes in the log: only IDs and the error name (NFR-SEC-06).
      logger.error("inquiry.notes_update_failed", { ...context, error });
      return fail("INTERNAL");
    }

    switch (outcome.result) {
      case "not_found":
        return fail("NOT_FOUND");
      case "unchanged":
        return ok({ updatedAt: outcome.updatedAt, changed: false });
      case "changed":
        logger.info("inquiry.notes_updated", context);
        deps.onChanged();
        return ok({ updatedAt: outcome.updatedAt, changed: true });
    }
  }

  async function updateNotes(formData: FormData): Promise<UpdateNotesResult> {
    const result = await updateNotesOnly(formData);
    return result.ok ? result : { ...result, values: { notes: fieldOf(formData, "notes") ?? "" } };
  }

  return { updateStatus, updateNotes };
}
