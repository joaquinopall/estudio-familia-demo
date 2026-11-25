import type { Metadata } from "next";
import Link from "next/link";

import { SafetyNotice } from "@/components/layout/safety-notice";
import { ContactDetails } from "@/components/marketing/contact-details";
import { FaqList } from "@/components/marketing/faq-list";
import { PageHeader } from "@/components/marketing/page-header";
import { UrgentNote } from "@/components/marketing/urgent-note";
import { siteConfig } from "@/config/site.config";
import { contactPageContent } from "@/content/contact-page";
import { getFeaturedFaqs } from "@/content/faqs";
import { InquiryFormSection } from "@/features/inquiries/components/inquiry-form-section";
import { publicEnv } from "@/lib/env.public";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import { buildBreadcrumbList } from "@/lib/seo/structured-data";

export const metadata: Metadata = buildPageMetadata({
  ...contactPageContent.metadata,
  path: "/contacto",
});

/**
 * /contacto (FR-01, SPEC §11.3). Static: the form reads ?area= on the client, so the page does
 * not need server-side searchParams.
 */
export default function ContactPage() {
  const { breadcrumbs, title, lead, details, faqs } = contactPageContent;

  return (
    <>
      <JsonLd data={buildBreadcrumbList(breadcrumbs, publicEnv.NEXT_PUBLIC_SITE_URL)} />
      <PageHeader id="contact-title" breadcrumbs={breadcrumbs} title={title} lead={lead} compact />
      <SafetyNotice compact />

      {/*
       * Since F3-07 the form works, so it goes first: it is what the "Contanos tu caso" CTAs
       * lead to. WhatsApp and the phone stay reachable in the header. Phones: form, details,
       * questions. Desktop: form and questions left (wider), details right.
       */}
      <div className="mx-auto grid max-w-6xl items-start gap-6 px-4 pt-3 pb-14 sm:pt-6 sm:pb-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-10">
        <InquiryFormSection />
        <div className="lg:row-span-2">
          <ContactDetails
            contact={siteConfig.contact}
            address={siteConfig.address}
            hours={siteConfig.hours}
            confidentialityNote={siteConfig.confidentialityNote}
            responseTime={siteConfig.responseTime}
            labels={details}
            notice={<UrgentNote contact={siteConfig.contact} hours={siteConfig.hours[0]} />}
          />
        </div>
        <section aria-labelledby="contact-faqs-title" className="pt-4">
          <h2 id="contact-faqs-title" className="text-2xl font-semibold text-primary sm:text-3xl">
            {faqs.title}
          </h2>
          <p className="mt-3 text-muted-foreground">{faqs.lead}</p>
          <FaqList faqs={getFeaturedFaqs()} className="mt-6" />
          <Link
            href={faqs.href}
            className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
          >
            {faqs.linkLabel}
          </Link>
        </section>
      </div>
    </>
  );
}
