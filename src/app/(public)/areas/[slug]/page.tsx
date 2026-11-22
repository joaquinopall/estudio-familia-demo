import { ArrowRight, ClipboardList, MessageCircleQuestion } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CtaLink } from "@/components/layout/cta-link";
import { PageHeader } from "@/components/marketing/page-header";
import { ContentList } from "@/components/marketing/content-list";
import { CtaSection } from "@/components/marketing/cta-section";
import { FactLabel } from "@/components/marketing/fact-label";
import { FaqList } from "@/components/marketing/faq-list";
import { SectionHeading } from "@/components/marketing/section-heading";
import { siteConfig } from "@/config/site.config";
import { areaPageContent, areasBreadcrumbs } from "@/content/area-pages";
import { homeContent } from "@/content/home";
import { getAreaContactHref, getPracticeAreaBySlug, practiceAreas } from "@/content/practice-areas";
import { publicEnv } from "@/lib/env.public";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import { buildAreaService, buildBreadcrumbList } from "@/lib/seo/structured-data";

/**
 * The 5 areas are prerendered at build time. `dynamicParams = false` is not allowed with
 * cacheComponents (next.config.ts). Instead, 'navigation' makes a request for an unknown slug
 * wait for the complete render instead of streaming the App Shell first, so notFound() still
 * answers a real 404 (not a 200 with noindex). It also fails the build if this route ever
 * gains request-time work (NFR-PERF-01).
 */
export const ensureStatic = "navigation";

export function generateStaticParams(): { slug: string }[] {
  return practiceAreas.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({ params }: PageProps<"/areas/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const area = getPracticeAreaBySlug(slug);
  if (!area) return {};

  return buildPageMetadata({ ...area.metadata, path: `/areas/${area.slug}` });
}

const cardClass = "rounded-2xl border border-border bg-card p-6 sm:p-8";

/** /areas/[slug] (FR-01, US-02 CA1, SPEC §11.3). Static, one page per practice area. */
export default async function AreaPage({ params }: PageProps<"/areas/[slug]">) {
  const { slug } = await params;
  const area = getPracticeAreaBySlug(slug);
  if (!area) notFound();

  const cta = { label: siteConfig.primaryCta.label, href: getAreaContactHref(area.slug) };
  const otherAreas = practiceAreas.filter((other) => other.slug !== area.slug);
  const labels = areaPageContent;
  const breadcrumbs = [...areasBreadcrumbs, { label: area.title, href: `/areas/${area.slug}` }];
  const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL;

  return (
    <>
      <JsonLd
        data={[
          buildAreaService(area, siteUrl, siteConfig.address.city),
          buildBreadcrumbList(breadcrumbs, siteUrl),
        ]}
      />
      <PageHeader id="area-title" breadcrumbs={breadcrumbs} title={area.title} lead={area.intro}>
        <div className="mt-8 flex flex-col items-start gap-2">
          <CtaLink href={cta.href} size="lg">
            {cta.label}
          </CtaLink>
          <p className="text-sm font-medium">{siteConfig.confidentialityNote}</p>
        </div>
      </PageHeader>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-14 sm:py-20 lg:grid-cols-2">
        <section aria-labelledby="when-title" className={cardClass}>
          <FactLabel icon={MessageCircleQuestion}>{area.shortTitle}</FactLabel>
          <h2 id="when-title" className="mt-3 text-2xl font-semibold text-primary sm:text-3xl">
            {labels.whenToConsultTitle}
          </h2>
          <ContentList items={area.whenToConsult} className="mt-6" />
        </section>

        <section aria-labelledby="documents-title" className={cardClass}>
          <FactLabel icon={ClipboardList}>{area.shortTitle}</FactLabel>
          <h2 id="documents-title" className="mt-3 text-2xl font-semibold text-primary sm:text-3xl">
            {labels.documentsTitle}
          </h2>
          <ContentList items={area.documents} className="mt-6" />
          <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
            {labels.documentsNote}
          </p>
        </section>
      </div>

      <section
        aria-labelledby="area-faqs-title"
        className="mx-auto grid max-w-6xl gap-x-16 gap-y-8 px-4 pb-14 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]"
      >
        <SectionHeading id="area-faqs-title" title={labels.faqsTitle} />
        <FaqList faqs={area.faqs} />
      </section>

      <nav aria-labelledby="other-areas-title" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 id="other-areas-title" className="text-2xl font-semibold text-primary">
            {labels.otherAreasTitle}
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {otherAreas.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/areas/${other.slug}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 font-medium transition-colors hover:border-primary/60"
                >
                  {other.shortTitle}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-primary"
                    strokeWidth={1.75}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <CtaSection
        id="area-final-cta-title"
        title={homeContent.finalCta.title}
        lead={homeContent.finalCta.lead}
        cta={cta}
        note={siteConfig.responseTime}
      />
    </>
  );
}
