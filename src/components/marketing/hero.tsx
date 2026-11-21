import type { LucideIcon } from "lucide-react";

import { CtaLink } from "@/components/layout/cta-link";
import type { NavItem } from "@/config/site.config";

import { FactLabel } from "./fact-label";

export type HeroFact = {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Optional link (e.g. the map); external links open in a new tab. */
  href?: string;
};

type HeroProps = {
  eyebrow: string;
  title: string;
  lead: string;
  cta: NavItem;
  /** Short reassurance under the call to action (e.g. confidentiality). */
  note: string;
  /** Practical data shown beside the copy on large screens only. */
  facts?: readonly HeroFact[];
};

/**
 * Home hero (US-01 CA1): who the firm is, what it does and the main call to action, compact
 * enough to fit above the fold on mobile. On large screens a "note card" with practical data
 * fills the right column; it is hidden on small screens to keep the CTA above the fold.
 */
export function Hero({ eyebrow, title, lead, cta, note, facts = [] }: HeroProps) {
  return (
    <section aria-labelledby="hero-title" className="bg-secondary/60">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-8 sm:py-20 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:py-24">
        <div className="flex flex-col items-start gap-4 sm:gap-6">
          <p className="flex items-center gap-3 text-sm font-semibold tracking-wide text-primary uppercase">
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
            {eyebrow}
          </p>
          <h1
            id="hero-title"
            className="max-w-3xl text-3xl font-semibold text-foreground sm:text-5xl lg:text-[3.4rem]"
          >
            {title}
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">{lead}</p>
          <div className="flex flex-col items-start gap-2">
            <CtaLink href={cta.href} size="lg">
              {cta.label}
            </CtaLink>
            <p className="text-sm font-medium text-foreground">{note}</p>
          </div>
        </div>

        {facts.length > 0 ? <HeroFacts facts={facts} /> : null}
      </div>
    </section>
  );
}

/** Note card with an offset "sheet" behind it, like papers on a desk. */
function HeroFacts({ facts }: { facts: readonly HeroFact[] }) {
  return (
    <div className="relative hidden lg:block">
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border border-border bg-background"
      />
      <dl className="relative divide-y divide-border rounded-2xl border border-border bg-card px-7 py-2 shadow-sm">
        {facts.map((fact) => (
          <div key={fact.label} className="py-5">
            <dt>
              <FactLabel icon={fact.icon}>{fact.label}</FactLabel>
            </dt>
            <dd className="mt-2 text-foreground">
              {fact.href ? (
                <a
                  href={fact.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-border underline-offset-4 hover:decoration-primary"
                >
                  {fact.value}
                  <span className="sr-only"> (se abre en una pestaña nueva)</span>
                </a>
              ) : (
                fact.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
