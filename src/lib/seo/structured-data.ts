import type { SiteConfig } from "@/config/site.config";
import type { Faq } from "@/content/faqs";
import type { PracticeAreaContent } from "@/content/practice-areas";

import type { JsonLdObject } from "./json-ld";

/**
 * schema.org builders (FR-14, US-02 CA2). All data comes from site.config.ts and src/content;
 * every URL is absolute, built from NEXT_PUBLIC_SITE_URL by the caller.
 */

const CONTEXT = "https://schema.org";

/** Absolute URL for a site path, tolerant of a trailing slash in the base URL. */
export function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`).toString();
}

/** Stable @id of the firm, referenced by other nodes (e.g. Service.provider). */
export function firmId(siteUrl: string): string {
  return `${absoluteUrl(siteUrl, "/")}#estudio`;
}

type FirmData = Pick<
  SiteConfig,
  "name" | "description" | "professionals" | "address" | "geo" | "openingHours" | "contact"
>;

/** LegalService for the public layout. */
export function buildLegalService(config: FirmData, siteUrl: string): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "LegalService",
    "@id": firmId(siteUrl),
    name: config.name,
    description: config.description,
    url: absoluteUrl(siteUrl, "/"),
    telephone: `+${config.contact.phoneE164}`,
    email: config.contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: config.address.street,
      addressLocality: config.address.city,
      addressRegion: config.address.region,
      postalCode: config.address.postalCode,
      addressCountry: config.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: config.geo.latitude,
      longitude: config.geo.longitude,
    },
    openingHoursSpecification: config.openingHours.map((spec) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: spec.days.map((day) => `${CONTEXT}/${day}`),
      opens: spec.opens,
      closes: spec.closes,
    })),
    employee: config.professionals.map((professional) => ({
      "@type": "Person",
      name: professional.name,
      description: professional.education,
    })),
  };
}

/** FAQPage for /preguntas-frecuentes. Answers as plain text, paragraphs joined. */
export function buildFaqPage(faqs: readonly Faq[]): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer.join("\n\n") },
    })),
  };
}

/** BreadcrumbList matching the visible breadcrumbs of an inner page. */
export function buildBreadcrumbList(
  items: readonly { label: string; href: string }[],
  siteUrl: string,
): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absoluteUrl(siteUrl, item.href),
    })),
  };
}

/** Service for /areas/[slug], provided by the firm (US-02 CA2). */
export function buildAreaService(
  area: Pick<PracticeAreaContent, "slug" | "title" | "metadata">,
  siteUrl: string,
  areaServed: string,
): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "Service",
    name: area.title,
    description: area.metadata.description,
    url: absoluteUrl(siteUrl, `/areas/${area.slug}`),
    serviceType: area.title,
    areaServed: { "@type": "City", name: areaServed },
    provider: { "@id": firmId(siteUrl) },
  };
}
