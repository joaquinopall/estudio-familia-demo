import { Info } from "lucide-react";
import type { Metadata } from "next";

import { ContentList } from "@/components/marketing/content-list";
import { type LegalSection, LegalDocument } from "@/components/marketing/legal-document";
import { PageHeader } from "@/components/marketing/page-header";
import { siteConfig } from "@/config/site.config";
import { type PrivacySection, privacyPolicy } from "@/content/legal/privacy";
import { formatLongDate } from "@/lib/format-date";

export const metadata: Metadata = {
  title: privacyPolicy.metadata.title,
  description: privacyPolicy.metadata.description,
};

/** The firm's identity, from site.config.ts (FR-03). */
function ControllerDetails() {
  const { name, address, contact } = siteConfig;

  return (
    <dl className="grid gap-3 rounded-xl border border-border bg-card p-5 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
      <dt className="font-semibold">Responsable</dt>
      <dd>{name}</dd>
      <dt className="font-semibold">Domicilio</dt>
      <dd>
        {address.street}, {address.city}
      </dd>
      <dt className="font-semibold">Email</dt>
      <dd>
        <a href={`mailto:${contact.email}`} className="underline underline-offset-4">
          {contact.email}
        </a>
      </dd>
    </dl>
  );
}

function toLegalSection(section: PrivacySection): LegalSection {
  return {
    id: section.id,
    title: section.title,
    body: (
      <>
        {section.paragraphs?.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {section.items ? <ContentList items={section.items} /> : null}
        {section.closing?.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {section.id === privacyPolicy.controllerId ? <ControllerDetails /> : null}
      </>
    ),
  };
}

/** /privacidad (FR-01, US-07 CA1): versioned privacy policy under Ley 25.326. Static. */
export default function PrivacyPage() {
  const { breadcrumbs, title, lead, demoNotice, tocLabel, version, effectiveDate } = privacyPolicy;

  return (
    <>
      <PageHeader id="privacy-title" breadcrumbs={breadcrumbs} title={title} lead={lead}>
        <p className="mt-6 text-sm text-muted-foreground">
          {privacyPolicy.versionLabel} {version} · {privacyPolicy.effectiveDateLabel}{" "}
          <time dateTime={effectiveDate}>{formatLongDate(effectiveDate)}</time>
        </p>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        {siteConfig.isFictitious ? (
          <p
            role="note"
            className="mb-10 flex max-w-3xl gap-3 rounded-xl border border-border bg-card p-4 text-sm"
          >
            <Info
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-primary"
              strokeWidth={1.5}
            />
            {demoNotice}
          </p>
        ) : null}
        <LegalDocument tocLabel={tocLabel} sections={privacyPolicy.sections.map(toLegalSection)} />
      </div>
    </>
  );
}
