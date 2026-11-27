"use client";

import { ErrorView } from "@/components/layout/error-view";
import { errorDigestOf } from "@/lib/error-digest";

/** Last resort below the root layout (FR-16), e.g. an error in the public layout itself. */
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex-1">
      <ErrorView retry={retry} digest={errorDigestOf(error)} />
    </main>
  );
}
