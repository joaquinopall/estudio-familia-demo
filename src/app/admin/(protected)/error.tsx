"use client";

/**
 * Error boundary of the protected panel pages (e.g. the database does not answer). A short,
 * generic message with a retry, inside the panel and without internal details (CLAUDE.md §4).
 * The error itself is logged on the server by the code that failed, or as `request.error`
 * (instrumentation.ts) with the digest shown here (F5-04).
 */
import { focusOutlineClass } from "@/components/forms/field-styles";
import { Button } from "@/components/ui/button";
import { adminPanelContent } from "@/content/admin-panel";
import { errorDigestOf } from "@/lib/error-digest";

const copy = adminPanelContent.list.loadError;

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  const digest = errorDigestOf(error);
  return (
    <main id="contenido" className="mx-auto grid w-full max-w-6xl gap-4 px-6 py-10">
      <div role="alert" className="rounded-lg border-l-4 border-destructive bg-secondary p-4">
        <h1 className="text-xl">{copy.title}</h1>
        <p className="mt-1">{copy.body}</p>
        {digest ? (
          <p className="mt-2 text-sm">
            {copy.code} <code className="font-mono">{digest}</code>
          </p>
        ) : null}
      </div>
      <div>
        <Button
          type="button"
          onClick={reset}
          className={`min-h-11 px-6 text-base ${focusOutlineClass}`}
        >
          {copy.retry}
        </Button>
      </div>
    </main>
  );
}
