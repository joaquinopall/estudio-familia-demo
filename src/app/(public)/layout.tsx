import type { ReactNode } from "react";

import { PublicShell } from "@/components/layout/public-shell";
import { siteConfig } from "@/config/site.config";
import { publicEnv } from "@/lib/env.public";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildLegalService } from "@/lib/seo/structured-data";

/** Public site: the shared shell plus the firm's LegalService structured data (FR-14). */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicShell>{children}</PublicShell>
      <JsonLd data={buildLegalService(siteConfig, publicEnv.NEXT_PUBLIC_SITE_URL)} />
    </>
  );
}
