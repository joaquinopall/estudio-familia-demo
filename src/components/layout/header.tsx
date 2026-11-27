import Link from "next/link";

import type { SiteConfig } from "@/config/site.config";

import { CtaLink } from "./cta-link";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";
import { WhatsAppButton } from "./whatsapp-button";

type HeaderProps = Pick<SiteConfig, "shortName" | "navigation" | "primaryCta"> & {
  whatsApp: { number: string; message: string };
};

/**
 * Sticky until the gutter breakpoint, because it carries WhatsApp (US-04). From there WhatsApp
 * floats in the side margin and the header scrolls away.
 * Below lg the name may wrap: with a larger browser font it does not fit in one line. Under
 * 18rem of width (browser font at 150% on a phone) the padding shrinks and "Menú" shows as
 * an icon only (F5-03).
 */
export function Header({ shortName, navigation, primaryCta, whatsApp }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background gutter:relative">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-1 px-4 py-1.5 max-[18rem]:px-2 min-[22.5rem]:gap-2 sm:py-3">
        <Link
          href="/"
          className="mr-auto inline-flex min-h-11 items-center font-heading text-base leading-tight font-semibold text-primary min-[22.5rem]:text-xl lg:mr-0 lg:whitespace-nowrap"
          aria-label={`${shortName} — Inicio`}
        >
          {shortName}
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <NavLinks items={navigation} variant="desktop" />
        </nav>

        <CtaLink
          href={primaryCta.href}
          className="hidden px-3 whitespace-nowrap lg:inline-flex nav:px-4"
        >
          {primaryCta.label}
        </CtaLink>

        <WhatsAppButton {...whatsApp} placement="header" />

        <MobileMenu items={navigation} cta={primaryCta} />
      </div>
    </header>
  );
}
