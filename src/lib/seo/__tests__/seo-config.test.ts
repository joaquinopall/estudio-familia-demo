import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { practiceAreas } from "@/content/practice-areas";
import { publicEnv } from "@/lib/env.public";
import { brandColors } from "@/lib/seo/brand-colors";
import { buildPageMetadata, buildSiteRobots } from "@/lib/seo/page-metadata";
import { getPublicPaths } from "@/lib/seo/routes";

describe("sitemap (FR-14)", () => {
  const urls = sitemap().map((entry) => entry.url);

  it("lists every public page once, with absolute URLs", () => {
    expect(urls).toHaveLength(6 + practiceAreas.length);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url.startsWith(new URL(publicEnv.NEXT_PUBLIC_SITE_URL).origin)).toBe(true);
    }
    for (const area of practiceAreas) {
      expect(urls.some((url) => url.endsWith(`/areas/${area.slug}`))).toBe(true);
    }
  });

  it("never lists the admin panel", () => {
    expect(urls.some((url) => url.includes("/admin"))).toBe(false);
    expect(getPublicPaths().some((path) => path.startsWith("/admin"))).toBe(false);
  });
});

describe("robots.txt (FR-14)", () => {
  it("blocks /admin, allows the public site and points to the sitemap", () => {
    const result = robots();

    expect(result.rules).toEqual({ userAgent: "*", allow: "/", disallow: "/admin" });
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});

describe("buildSiteRobots (ADR-0010)", () => {
  it("keeps the demo out of search results", () => {
    expect(buildSiteRobots(true)).toEqual({ index: false, follow: false });
  });

  it("indexes a real firm's site", () => {
    expect(buildSiteRobots(false)).toEqual({ index: true, follow: true });
  });
});

describe("buildPageMetadata (NFR-SEO-01)", () => {
  it("returns canonical and a complete Open Graph object", () => {
    expect(buildPageMetadata({ title: "T", description: "D", path: "/x" })).toEqual({
      title: "T",
      description: "D",
      alternates: { canonical: "/x" },
      openGraph: expect.objectContaining({
        type: "website",
        locale: "es_AR",
        title: "T",
        description: "D",
        url: "/x",
      }) as unknown,
    });
  });

  it("always lists the OG image, which a page-level openGraph would otherwise drop", () => {
    expect(buildPageMetadata({ title: "T", description: "D", path: "/x" })).toMatchObject({
      openGraph: { images: [{ url: "/opengraph-image", width: 1200, height: 630 }] },
    });
  });
});

describe("brandColors", () => {
  it("matches the design tokens in globals.css", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const token = (name: string) =>
      new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, "i").exec(css)?.[1]?.toLowerCase();

    expect(brandColors).toEqual({
      background: token("background"),
      foreground: token("foreground"),
      primary: token("primary"),
      primaryForeground: token("primary-foreground"),
      secondary: token("secondary"),
      mutedForeground: token("muted-foreground"),
      accent: token("accent"),
    });
  });
});
