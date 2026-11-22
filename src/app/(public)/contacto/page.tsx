import type { Metadata } from "next";
import Link from "next/link";

import { ContactDetails } from "@/components/marketing/contact-details";
import { FaqList } from "@/components/marketing/faq-list";
import { InquiryFormSlot } from "@/components/marketing/inquiry-form-slot";
import { PageHeader } from "@/components/marketing/page-header";
import { SectionHeading } from "@/components/marketing/section-heading";
import { siteConfig } from "@/config/site.config";
import { contactPageContent } from "@/content/contact-page";
import { getFeaturedFaqs } from "@/content/faqs";

export const metadata: Metadata = {
  title: contactPageContent.metadata.title,
  description: contactPageContent.metadata.description,
};

/**
 * /contacto (FR-01, SPEC §11.3). Static: the form (F3) will read ?area= on the client, so the
 * page does not need server-side searchParams.
 */
export default function ContactPage() {
  const { breadcrumbs, title, lead, formSlot, details, faqs } = contactPageContent;

  return (
    <>
      <PageHeader
        id="contact-title"
        breadcrumbs={breadcrumbs}
        title={title}
        lead={[lead, siteConfig.responseTime]}
      />

      <div className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-10">
        <InquiryFormSlot title={formSlot.title} notice={formSlot.notice} />
        <ContactDetails
          contact={siteConfig.contact}
          address={siteConfig.address}
          hours={siteConfig.hours}
          confidentialityNote={siteConfig.confidentialityNote}
          responseTime={siteConfig.responseTime}
          labels={details}
        />
      </div>

      <section aria-labelledby="contact-faqs-title" className="bg-secondary/60">
        <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-6 px-4 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
          <div>
            <SectionHeading id="contact-faqs-title" title={faqs.title} lead={faqs.lead} />
            <Link
              href={faqs.href}
              className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
            >
              {faqs.linkLabel}
            </Link>
          </div>
          <FaqList faqs={getFeaturedFaqs()} />
        </div>
      </section>
    </>
  );
}
