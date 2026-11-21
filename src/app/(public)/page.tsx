import { Clock, Hourglass, MapPin } from "lucide-react";
import Link from "next/link";

import { CtaSection } from "@/components/marketing/cta-section";
import { FaqList } from "@/components/marketing/faq-list";
import { Hero, type HeroFact } from "@/components/marketing/hero";
import { PracticeAreaCard } from "@/components/marketing/practice-area-card";
import { ProcessSteps } from "@/components/marketing/process-steps";
import { SectionHeading } from "@/components/marketing/section-heading";
import { TrustBar } from "@/components/marketing/trust-bar";
import { siteConfig } from "@/config/site.config";
import { getFeaturedFaqs } from "@/content/faqs";
import { homeContent } from "@/content/home";
import { practiceAreas } from "@/content/practice-areas";

const sectionClass = "mx-auto max-w-6xl px-4 py-14 sm:py-20 lg:py-24";

/** 1 column on mobile, 2 on tablet, 3 on desktop; an incomplete last row stays centered. */
const areaItemClass = "w-full sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]";

const heroFacts: readonly HeroFact[] = [
  {
    icon: MapPin,
    label: "Dónde estamos",
    value: `${siteConfig.address.street}, ${siteConfig.address.city}`,
    href: siteConfig.address.mapsUrl,
  },
  ...siteConfig.hours.slice(0, 1).map((entry) => ({
    icon: Clock,
    label: "Horario de atención",
    value: `${entry.days}, ${entry.hours}`,
  })),
  { icon: Hourglass, label: "Tiempo de respuesta", value: siteConfig.responseTime },
];

/** Home page (US-01, SPEC §11.3). Static: all data comes from content and config. */
export default function HomePage() {
  const { hero, areas, process, trust, faqs, finalCta } = homeContent;

  return (
    <>
      <Hero
        eyebrow={hero.eyebrow}
        title={hero.title}
        lead={hero.lead}
        cta={siteConfig.primaryCta}
        note={siteConfig.confidentialityNote}
        facts={heroFacts}
      />

      <section aria-labelledby="areas-title" className={sectionClass}>
        <SectionHeading id="areas-title" title={areas.title} lead={areas.lead} />
        <ul className="mt-10 flex flex-wrap justify-center gap-5">
          {practiceAreas.map((area) => (
            <li key={area.slug} className={areaItemClass}>
              <PracticeAreaCard area={area} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="process-title" className="bg-secondary/60">
        <div className={sectionClass}>
          <SectionHeading id="process-title" title={process.title} lead={process.lead} />
          <div className="mt-10 sm:mt-12">
            <ProcessSteps steps={process.steps} />
          </div>
        </div>
      </section>

      <section aria-labelledby="trust-title" className={sectionClass}>
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

      <section
        aria-labelledby="faqs-title"
        className={`${sectionClass} grid grid-cols-1 content-start gap-x-16 gap-y-6 pt-0 sm:pt-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] lg:pt-0`}
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
