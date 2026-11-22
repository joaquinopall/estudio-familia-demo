import { BadgeCheck } from "lucide-react";
import type { ReactNode } from "react";

import { CtaLink } from "@/components/layout/cta-link";
import type { NavItem, Professional } from "@/config/site.config";

import { FactLabel } from "./fact-label";

type HeroCredentials = {
  label: string;
  professionals: readonly Pick<Professional, "name" | "registration">[];
  /** Where the firm litigates. */
  note: string;
};

type HeroProps = {
  eyebrow: string;
  title: string;
  lead: string;
  cta: NavItem;
  /** Short reassurance above the call to action (e.g. confidentiality). */
  note: string;
  /** Who answers, shown beside the copy on large screens only. */
  credentials?: HeroCredentials;
  /** Secondary content under the call to action (e.g. the urgent note). */
  children?: ReactNode;
};

/**
 * Home hero (US-01 CA1): who the firm is, what it does and the main call to action, compact
 * enough to fit above the fold on a 320x568 phone. On large screens a "note card" with the
 * professionals fills the right column; it is hidden on small screens to keep the CTA above
 * the fold.
 */
export function Hero({ eyebrow, title, lead, cta, note, credentials, children }: HeroProps) {
  return (
    <section aria-labelledby="hero-title" className="bg-secondary/60">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-4 pb-8 sm:py-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col items-start gap-3 sm:gap-6">
          <p className="flex items-center gap-3 text-sm font-semibold tracking-wide text-primary uppercase">
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
            {eyebrow}
          </p>
          <h1
            id="hero-title"
            className="max-w-3xl text-[1.625rem] font-semibold text-foreground min-[22.5rem]:text-3xl sm:text-5xl lg:text-[3.4rem]"
          >
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-normal text-muted-foreground sm:text-lg sm:leading-relaxed">
            {lead}
          </p>
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm font-medium text-foreground">{note}</p>
            <CtaLink href={cta.href} size="lg">
              {cta.label}
            </CtaLink>
          </div>
          {children}
        </div>

        {credentials ? <HeroCredentialsCard {...credentials} /> : null}
      </div>
    </section>
  );
}

/** Note card with an offset "sheet" behind it, like papers on a desk. */
function HeroCredentialsCard({ label, professionals, note }: HeroCredentials) {
  return (
    <div className="relative hidden lg:block">
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border border-border bg-background"
      />
      <div className="relative rounded-2xl border border-border bg-card px-7 py-6 shadow-sm">
        <FactLabel icon={BadgeCheck}>{label}</FactLabel>
        <ul className="mt-2 divide-y divide-border">
          {professionals.map(({ name, registration }) => (
            <li key={name} className="py-4">
              <span className="block font-heading text-xl font-semibold text-primary">{name}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{registration}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-border pt-4 text-sm font-medium">{note}</p>
      </div>
    </div>
  );
}
