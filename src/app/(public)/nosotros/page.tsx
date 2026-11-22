import type { Metadata } from "next";

import { CtaSection } from "@/components/marketing/cta-section";
import { PageHeader } from "@/components/marketing/page-header";
import { ProfessionalCard } from "@/components/marketing/professional-card";
import { SectionHeading } from "@/components/marketing/section-heading";
import { siteConfig } from "@/config/site.config";
import { aboutContent } from "@/content/about";
import { homeContent } from "@/content/home";
import { publicEnv } from "@/lib/env.public";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import { buildBreadcrumbList } from "@/lib/seo/structured-data";

export const metadata: Metadata = buildPageMetadata({
  ...aboutContent.metadata,
  path: "/nosotros",
});

const sectionClass = "mx-auto max-w-6xl px-4 py-14 sm:py-20";

/** /nosotros (FR-01, SPEC §11.3): approach, professionals and values. Static. */
export default function AboutPage() {
  const { breadcrumbs, title, lead, approach, professionals, values } = aboutContent;

  return (
    <>
      <JsonLd data={buildBreadcrumbList(breadcrumbs, publicEnv.NEXT_PUBLIC_SITE_URL)} />
      <PageHeader id="about-title" breadcrumbs={breadcrumbs} title={title} lead={lead} />

      <section
        aria-labelledby="approach-title"
        className={`${sectionClass} grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]`}
      >
        <SectionHeading id="approach-title" title={approach.title} />
        <div className="space-y-4 text-lg">
          {approach.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section aria-labelledby="professionals-title" className="bg-secondary/60">
        <div className={sectionClass}>
          <SectionHeading
            id="professionals-title"
            title={professionals.title}
            lead={professionals.lead}
          />
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {siteConfig.professionals.map((professional) => (
              <li key={professional.name}>
                <ProfessionalCard professional={professional} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="values-title" className={sectionClass}>
        <SectionHeading id="values-title" title={values.title} />
        <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {values.items.map((value) => (
            <li key={value.title} className="border-t border-border pt-5">
              <h3 className="text-xl font-semibold">{value.title}</h3>
              <p className="mt-2 text-muted-foreground">{value.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <CtaSection
        id="about-final-cta-title"
        title={homeContent.finalCta.title}
        lead={homeContent.finalCta.lead}
        cta={siteConfig.primaryCta}
        note={siteConfig.responseTime}
      />
    </>
  );
}
