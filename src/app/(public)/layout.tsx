import type { ReactNode } from "react";

import { DemoBanner } from "@/components/layout/demo-banner";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/layout/skip-link";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { siteConfig } from "@/config/site.config";
import { publicEnv } from "@/lib/env.public";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildLegalService } from "@/lib/seo/structured-data";

/**
 * Public site shell: skip link, demo banner, header, footer, WhatsApp button and the firm's
 * LegalService structured data (FR-14).
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <DemoBanner enabled={publicEnv.NEXT_PUBLIC_DEMO_MODE} />
      <Header
        shortName={siteConfig.shortName}
        navigation={siteConfig.navigation}
        primaryCta={siteConfig.primaryCta}
      />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer config={siteConfig} />
      <WhatsAppButton
        number={siteConfig.contact.whatsappNumber}
        message={siteConfig.contact.whatsappMessage}
      />
      <JsonLd data={buildLegalService(siteConfig, publicEnv.NEXT_PUBLIC_SITE_URL)} />
    </>
  );
}
