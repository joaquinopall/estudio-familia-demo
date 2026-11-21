import type { Metadata } from "next";

import { CtaSection } from "@/components/marketing/cta-section";
import { FaqList } from "@/components/marketing/faq-list";
import { PageHeader } from "@/components/marketing/page-header";
import { PracticeAreaGrid } from "@/components/marketing/practice-area-grid";
import { SectionHeading } from "@/components/marketing/section-heading";
import { TableOfContents } from "@/components/marketing/table-of-contents";
import { siteConfig } from "@/config/site.config";
import { faqPageContent } from "@/content/faq-page";
import { getFaqsByGroup } from "@/content/faqs";
import { practiceAreas } from "@/content/practice-areas";

export const metadata: Metadata = {
  title: faqPageContent.metadata.title,
  description: faqPageContent.metadata.description,
};

/** /preguntas-frecuentes (FR-01, SPEC §11.3): general questions grouped by topic. Static. */
export default function FaqPage() {
  const { breadcrumbs, title, lead, tocLabel, areas, finalCta } = faqPageContent;
  const groups = getFaqsByGroup();

  return (
    <>
      <PageHeader id="faq-title" breadcrumbs={breadcrumbs} title={title} lead={lead} />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16">
        <TableOfContents label={tocLabel} items={groups} className="h-fit lg:sticky lg:top-6" />
        <div className="max-w-3xl space-y-14">
          {groups.map((group) => (
            <section
              key={group.id}
              id={group.id}
              aria-labelledby={`${group.id}-title`}
              className="scroll-mt-6"
            >
              <h2
                id={`${group.id}-title`}
                className="text-2xl font-semibold text-primary sm:text-3xl"
              >
                {group.title}
              </h2>
              <FaqList faqs={group.faqs} className="mt-6" />
            </section>
          ))}
        </div>
      </div>

      <section aria-labelledby="faq-areas-title" className="bg-secondary/60">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <SectionHeading id="faq-areas-title" title={areas.title} lead={areas.lead} />
          <PracticeAreaGrid areas={practiceAreas} className="mt-10" />
        </div>
      </section>

      <CtaSection
        id="faq-final-cta-title"
        title={finalCta.title}
        lead={finalCta.lead}
        cta={siteConfig.primaryCta}
        note={siteConfig.responseTime}
      />
    </>
  );
}
