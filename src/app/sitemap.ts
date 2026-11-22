import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env.public";
import { getPublicPaths } from "@/lib/seo/routes";
import { absoluteUrl } from "@/lib/seo/structured-data";

/** /sitemap.xml (FR-14): static pages plus one entry per practice area. */
export default function sitemap(): MetadataRoute.Sitemap {
  return getPublicPaths().map((path) => ({
    url: absoluteUrl(publicEnv.NEXT_PUBLIC_SITE_URL, path),
  }));
}
