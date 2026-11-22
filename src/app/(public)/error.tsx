"use client";

import { ErrorView } from "@/components/layout/error-view";

/** Error in a public page (FR-16): header, footer and WhatsApp stay available. */
export default function PublicError({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorView retry={retry} />;
}
