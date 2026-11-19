import type { ReactNode } from "react";

import { DemoBanner } from "@/components/layout/demo-banner";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/layout/skip-link";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { siteConfig } from "@/config/site.config";
import { publicEnv } from "@/lib/env.public";

/** Public site shell: skip link, demo banner, header, footer and WhatsApp button. */
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
    </>
  );
}
