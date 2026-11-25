"use client";

/**
 * Change the status of an inquiry (FR-11, FR-12). A real form posting to a Server Action: it
 * works without JavaScript. The result is announced: confirmation in role="status", errors in
 * role="alert". The page refreshes after a change, so the badge and the history update too.
 */
import { useActionState } from "react";

import { controlClass, focusOutlineClass } from "@/components/forms/field-styles";
import { Button } from "@/components/ui/button";
import { adminPanelContent } from "@/content/admin-panel";

import { updateInquiryStatus } from "../actions";
import { INQUIRY_STATUS_LABELS } from "../labels";
import { INQUIRY_STATUSES, type InquiryStatus } from "../types";

const copy = adminPanelContent.detail.status;

export function StatusForm({ id, status }: { id: string; status: InquiryStatus }) {
  const [state, formAction, pending] = useActionState(updateInquiryStatus, null);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="inquiry-status" className="mb-1 block font-medium text-foreground">
          {copy.label}
        </label>
        {/* key: after a change the page refreshes with the new status as the default. */}
        <select
          key={status}
          id="inquiry-status"
          name="status"
          defaultValue={status}
          className={controlClass}
        >
          {INQUIRY_STATUSES.map((value) => (
            <option key={value} value={value}>
              {INQUIRY_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={pending}
          className={`min-h-11 px-6 text-base ${focusOutlineClass}`}
        >
          {pending ? copy.submitting : copy.submit}
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {state?.ok ? (state.data.changed ? copy.changed : copy.unchanged) : null}
        </p>
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error.message}
        </p>
      ) : null}
    </form>
  );
}
