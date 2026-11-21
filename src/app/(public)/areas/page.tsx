import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CtaSection } from "@/components/marketing/cta-section";
import { PracticeAreaGrid } from "@/components/marketing/practice-area-grid";
import { siteConfig } from "@/config/site.config";
import { areasBreadcrumbs, areasIndexContent } from "@/content/area-pages";
import { practiceAreas } from "@/content/practice-areas";

export const metadata: Metadata = {
  title: areasIndexContent.metadata.title,
  description: areasIndexContent.metadata.description,
};

/** /areas (FR-01): index of the practice areas. Static. */
export default function AreasPage() {
  const { title, lead, otherTopic } = areasIndexContent;

  return (
    <>
      <section aria-labelledby="areas-index-title" className="bg-secondary/60">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:pt-10 sm:pb-16">
          <Breadcrumbs items={areasBreadcrumbs} />
          <h1
            id="areas-index-title"
            className="mt-6 text-3xl font-semibold text-foreground sm:text-5xl"
          >
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{lead}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <PracticeAreaGrid areas={practiceAreas} />
      </div>

      <CtaSection
        id="areas-other-topic-title"
        title={otherTopic.title}
        lead={otherTopic.lead}
        cta={siteConfig.primaryCta}
        note={siteConfig.responseTime}
      />
    </>
  );
}
