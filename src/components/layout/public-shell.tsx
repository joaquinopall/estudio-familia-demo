import type { ReactNode } from "react";

import { siteConfig } from "@/config/site.config";
import { publicEnv } from "@/lib/env.public";

import { DemoBanner } from "./demo-banner";
import { Footer } from "./footer";
import { Header } from "./header";
import { MAIN_CONTENT_ID, SkipLink } from "./skip-link";
import { WhatsAppButton } from "./whatsapp-button";

/**
 * Skip link, demo banner, header, main, footer and WhatsApp button. Used by the public layout
 * and by the root 404, which renders outside that layout (FR-16).
 */
export function PublicShell({ children }: { children: ReactNode }) {
  const whatsApp = {
    number: siteConfig.contact.whatsappNumber,
    message: siteConfig.contact.whatsappMessage,
  };

  return (
    <>
      <SkipLink />
      <DemoBanner enabled={publicEnv.NEXT_PUBLIC_DEMO_MODE} />
      <Header
        shortName={siteConfig.shortName}
        navigation={siteConfig.navigation}
        primaryCta={siteConfig.primaryCta}
        whatsApp={whatsApp}
      />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer config={siteConfig} />
      <WhatsAppButton {...whatsApp} />
    </>
  );
}
