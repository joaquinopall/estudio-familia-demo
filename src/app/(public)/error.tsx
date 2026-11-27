"use client";

import { ErrorView } from "@/components/layout/error-view";
import { errorDigestOf } from "@/lib/error-digest";

/** Error in a public page (FR-16): header, footer and WhatsApp stay available. */
export default function PublicError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorView retry={retry} digest={errorDigestOf(error)} />;
}
