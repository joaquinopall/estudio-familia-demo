import type { Metadata } from "next";
import Link from "next/link";

import { CtaSection } from "@/components/marketing/cta-section";
import { FaqList } from "@/components/marketing/faq-list";
import { Hero } from "@/components/marketing/hero";
import { PracticeAreaGrid } from "@/components/marketing/practice-area-grid";
import { ProcessSteps } from "@/components/marketing/process-steps";
import { SectionHeading } from "@/components/marketing/section-heading";
import { TrustBar } from "@/components/marketing/trust-bar";
import { UrgentNote } from "@/components/marketing/urgent-note";
import { siteConfig } from "@/config/site.config";
import { getFeaturedFaqs } from "@/content/faqs";
import { homeContent } from "@/content/home";
import { practiceAreas } from "@/content/practice-areas";
import { buildPageMetadata } from "@/lib/seo/page-metadata";

export const metadata: Metadata = {
  ...buildPageMetadata({ title: siteConfig.name, description: siteConfig.description, path: "/" }),
  // The home shows the firm name alone, without the "%s · shortName" template.
  title: { absolute: siteConfig.name },
};

const sectionClass = "mx-auto max-w-6xl px-4 py-14 sm:py-20 lg:py-24";

/** Home page (US-01, SPEC §11.3). Static: all data comes from content and config. */
export default function HomePage() {
  const { hero, areas, process, trust, faqs, finalCta } = homeContent;

  return (
    <>
      <Hero
        eyebrow={`${hero.eyebrow} · ${siteConfig.jurisdiction.label}`}
        title={hero.title}
        lead={hero.lead}
        cta={siteConfig.primaryCta}
        note={siteConfig.confidentialityNote}
        credentials={{
          label: hero.credentialsLabel,
          professionals: siteConfig.professionals,
          note: siteConfig.jurisdiction.note,
        }}
      >
        <UrgentNote contact={siteConfig.contact} hours={siteConfig.hours[0]} />
      </Hero>

      <section aria-labelledby="areas-title" className={sectionClass}>
        <SectionHeading id="areas-title" title={areas.title} lead={areas.lead} />
        <PracticeAreaGrid areas={practiceAreas} className="mt-10" />
      </section>

      {/* Trust before process: who answers matters more than how (SPEC §11.3). */}
      <section aria-labelledby="trust-title" className={`${sectionClass} pt-0 sm:pt-0 lg:pt-0`}>
        <SectionHeading id="trust-title" title={trust.title} lead={trust.lead} />
        <div className="mt-10">
          <TrustBar
            professionals={siteConfig.professionals}
            address={siteConfig.address}
            hours={siteConfig.hours}
            confidentialityNote={siteConfig.confidentialityNote}
            responseTime={siteConfig.responseTime}
          />
        </div>
      </section>

      <section aria-labelledby="process-title" className="bg-secondary/60">
        <div className={sectionClass}>
          <SectionHeading id="process-title" title={process.title} lead={process.lead} />
          <div className="mt-10 sm:mt-12">
            <ProcessSteps steps={process.steps} />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="faqs-title"
        className={`${sectionClass} grid grid-cols-1 content-start gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]`}
      >
        <SectionHeading id="faqs-title" title={faqs.title} lead={faqs.lead} />
        {/* Mobile: heading → list → link. Desktop: heading and link left, list right. */}
        <div className="mt-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
          <FaqList faqs={getFeaturedFaqs()} />
        </div>
        <Link
          href={faqs.href}
          className="inline-flex min-h-11 items-center self-start justify-self-start font-semibold text-primary underline underline-offset-4"
        >
          {faqs.linkLabel}
        </Link>
      </section>

      <CtaSection
        id="final-cta-title"
        title={finalCta.title}
        lead={finalCta.lead}
        cta={siteConfig.primaryCta}
        note={siteConfig.responseTime}
      />
    </>
  );
}
