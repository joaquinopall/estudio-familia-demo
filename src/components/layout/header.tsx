import Link from "next/link";

import type { SiteConfig } from "@/config/site.config";

import { CtaLink } from "./cta-link";
import { MobileMenu } from "./mobile-menu";

type HeaderProps = Pick<SiteConfig, "shortName" | "navigation" | "primaryCta">;

export function Header({ shortName, navigation, primaryCta }: HeaderProps) {
  return (
    <header className="relative border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="font-heading text-xl font-semibold text-primary"
          aria-label={`${shortName} — Inicio`}
        >
          {shortName}
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <CtaLink href={primaryCta.href} className="hidden lg:inline-flex">
          {primaryCta.label}
        </CtaLink>

        <MobileMenu items={navigation} cta={primaryCta} />
      </div>
    </header>
  );
}
