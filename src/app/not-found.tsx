import type { Metadata } from "next";

import { NotFoundView } from "@/components/layout/not-found-view";
import { PublicShell } from "@/components/layout/public-shell";
import { notFoundContent } from "@/content/error-pages";

export const metadata: Metadata = { title: notFoundContent.metaTitle };

/** 404 for URLs that match no route (FR-16). It renders outside (public), hence the shell. */
export default function RootNotFound() {
  return (
    <PublicShell>
      <NotFoundView />
    </PublicShell>
  );
}
