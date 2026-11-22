import type { Metadata } from "next";

import { CtaSection } from "@/components/marketing/cta-section";
import { PageHeader } from "@/components/marketing/page-header";
import { PracticeAreaGrid } from "@/components/marketing/practice-area-grid";
import { siteConfig } from "@/config/site.config";
import { areasBreadcrumbs, areasIndexContent } from "@/content/area-pages";
import { practiceAreas } from "@/content/practice-areas";
import { publicEnv } from "@/lib/env.public";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import { buildBreadcrumbList } from "@/lib/seo/structured-data";

export const metadata: Metadata = buildPageMetadata({
  ...areasIndexContent.metadata,
  path: "/areas",
});

/** /areas (FR-01): index of the practice areas. Static. */
export default function AreasPage() {
  const { title, lead, listTitle, otherTopic } = areasIndexContent;

  return (
    <>
      <PageHeader
        id="areas-index-title"
        breadcrumbs={areasBreadcrumbs}
        title={title}
        lead={[lead, siteConfig.jurisdiction.note]}
      />

      <section aria-labelledby="areas-list-title" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        {/* The cards are h3: this h2 keeps the outline without repeating the h1 visually. */}
        <h2 id="areas-list-title" className="sr-only">
          {listTitle}
        </h2>
        <PracticeAreaGrid areas={practiceAreas} />
      </section>

      <CtaSection
        id="areas-other-topic-title"
        title={otherTopic.title}
        lead={otherTopic.lead}
        cta={siteConfig.primaryCta}
        note={siteConfig.responseTime}
      />
      <JsonLd data={buildBreadcrumbList(areasBreadcrumbs, publicEnv.NEXT_PUBLIC_SITE_URL)} />
    </>
  );
}
