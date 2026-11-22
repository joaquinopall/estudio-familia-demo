"use client";

import { ErrorView } from "@/components/layout/error-view";

/** Last resort below the root layout (FR-16), e.g. an error in the public layout itself. */
export default function RootError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex-1">
      <ErrorView retry={retry} />
    </main>
  );
}
