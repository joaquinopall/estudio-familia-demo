"use client";

/**
 * Internal notes of an inquiry (US-06 CA3, FR-12). A real form posting to a Server Action: it
 * works without JavaScript. A rejected save gives the text back, so nothing typed is lost.
 * Confirmation in role="status", errors in role="alert" and next to the field.
 */
import { useActionState, useState } from "react";

import { controlClass, focusOutlineClass } from "@/components/forms/field-styles";
import { Button } from "@/components/ui/button";
import { adminPanelContent } from "@/content/admin-panel";

import { updateInquiryNotes } from "../actions";
import { NOTES_MAX_LENGTH } from "../schema";

const copy = adminPanelContent.detail.notes;

const ids = { field: "inquiry-notes", hint: "inquiry-notes-hint", error: "inquiry-notes-error" };

export function NotesForm({ id, notes }: { id: string; notes: string | null }) {
  const [state, formAction, pending] = useActionState(updateInquiryNotes, null);
  const value = state && !state.ok ? (state.values?.notes ?? "") : (notes ?? "");
  const [length, setLength] = useState(value.length);
  // A new saved or rejected text restarts the field (key below), so the counter follows it.
  const [seenValue, setSeenValue] = useState(value);
  if (seenValue !== value) {
    setSeenValue(value);
    setLength(value.length);
  }
  const fieldError = state && !state.ok ? state.error.fieldErrors?.notes?.[0] : undefined;
  const generalError = state && !state.ok && !fieldError ? state.error.message : undefined;

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor={ids.field} className="mb-1 block font-medium text-foreground">
          {copy.label}
        </label>
        {/* key: restarts the field from the saved (or rejected) text after each answer. */}
        <textarea
          key={value}
          id={ids.field}
          name="notes"
          rows={6}
          defaultValue={value}
          maxLength={NOTES_MAX_LENGTH}
          onChange={(event) => setLength(event.currentTarget.value.length)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={[ids.hint, fieldError ? ids.error : null].filter(Boolean).join(" ")}
          className={`${controlClass} min-h-32`}
        />
        <p id={ids.hint} className="mt-1 flex justify-between gap-3 text-sm text-muted-foreground">
          <span>{copy.hint}</span>
          <span>
            {length} / {NOTES_MAX_LENGTH} {copy.characters}
          </span>
        </p>
        {fieldError ? (
          <p id={ids.error} className="mt-1 text-sm font-medium text-destructive">
            {fieldError}
          </p>
        ) : null}
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
          {state?.ok ? (state.data.changed ? copy.saved : copy.unchanged) : null}
        </p>
      </div>
      {generalError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {generalError}
        </p>
      ) : null}
    </form>
  );
}
