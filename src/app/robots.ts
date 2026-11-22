import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env.public";
import { absoluteUrl } from "@/lib/seo/structured-data";

/**
 * /robots.txt (FR-14): the admin panel is excluded. Crawling of the public site stays allowed
 * even in demo mode: indexing is prevented with the robots meta instead (ADR-0010), so tools
 * like the Rich Results Test can still read the pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: absoluteUrl(publicEnv.NEXT_PUBLIC_SITE_URL, "/sitemap.xml"),
  };
}
