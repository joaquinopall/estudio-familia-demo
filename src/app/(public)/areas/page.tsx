import type { Metadata } from "next";

import { CtaSection } from "@/components/marketing/cta-section";
import { PageHeader } from "@/components/marketing/page-header";
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
      <PageHeader id="areas-index-title" breadcrumbs={areasBreadcrumbs} title={title} lead={lead} />

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
