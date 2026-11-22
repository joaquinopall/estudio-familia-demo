import type { Metadata } from "next";

import { siteConfig } from "@/config/site.config";
import { ogImage } from "@/lib/seo/og-image";

/**
 * Site-wide robots meta (ADR-0010). The demo shows a fictitious firm with fictitious bar
 * registrations: it must not appear in search results (SPEC §11.4), so demo mode is
 * noindex/nofollow. Crawling stays allowed (robots.txt) so tools like Google's Rich Results
 * Test can still read the pages. A real firm (demo mode off) is indexed normally.
 */
export function buildSiteRobots(demoMode: boolean): Metadata["robots"] {
  return demoMode ? { index: false, follow: false } : { index: true, follow: true };
}

type PageMetadataInput = {
  title: string;
  description: string;
  /** Site path, e.g. "/areas/sucesiones". Resolved against metadataBase (root layout). */
  path: string;
};

/**
 * Complete metadata for a public page (NFR-SEO-01): title, description, canonical and Open
 * Graph. Next merges metadata shallowly, so a page that sets `openGraph` replaces the root
 * layout's one entirely, including the image of src/app/opengraph-image.tsx: this helper
 * always returns the full object, image included.
 */
export function buildPageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName: siteConfig.name,
      title,
      description,
      url: path,
      images: [ogImage],
    },
  };
}
