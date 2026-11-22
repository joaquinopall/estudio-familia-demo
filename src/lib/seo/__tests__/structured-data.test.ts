import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site.config";
import { generalFaqs } from "@/content/faqs";
import { practiceAreas } from "@/content/practice-areas";
import {
  absoluteUrl,
  buildAreaService,
  buildBreadcrumbList,
  buildFaqPage,
  buildLegalService,
  firmId,
} from "@/lib/seo/structured-data";

const SITE = "https://demo.example.com";

describe("absoluteUrl", () => {
  it.each([SITE, `${SITE}/`])("joins paths with base %s", (base) => {
    expect(absoluteUrl(base, "/areas/sucesiones")).toBe(`${SITE}/areas/sucesiones`);
    expect(absoluteUrl(base, "/")).toBe(`${SITE}/`);
  });
});

describe("buildLegalService (FR-14)", () => {
  const node = buildLegalService(siteConfig, SITE);

  it("describes the firm with data from site.config", () => {
    expect(node).toMatchObject({
      "@context": "https://schema.org",
      "@type": "LegalService",
      "@id": `${SITE}/#estudio`,
      name: siteConfig.name,
      url: `${SITE}/`,
      telephone: `+${siteConfig.contact.phoneE164}`,
      email: siteConfig.contact.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: siteConfig.address.street,
        addressCountry: siteConfig.address.country,
      },
      geo: { latitude: siteConfig.geo.latitude, longitude: siteConfig.geo.longitude },
    });
  });

  it("includes structured opening hours", () => {
    expect(node.openingHoursSpecification).toEqual(
      siteConfig.openingHours.map((spec) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: spec.days.map((day) => `https://schema.org/${day}`),
        opens: spec.opens,
        closes: spec.closes,
      })),
    );
  });

  it("lists every professional", () => {
    expect(node.employee).toHaveLength(siteConfig.professionals.length);
  });
});

describe("buildFaqPage (FR-14)", () => {
  it("has every question with a plain-text answer", () => {
    const node = buildFaqPage(generalFaqs);
    const entities = node.mainEntity as { name: string; acceptedAnswer: { text: string } }[];

    expect(node["@type"]).toBe("FAQPage");
    expect(entities).toHaveLength(generalFaqs.length);
    expect(entities[0]?.name).toBe(generalFaqs[0]?.question);
    expect(entities[0]?.acceptedAnswer.text).toBe(generalFaqs[0]?.answer.join("\n\n"));
  });
});

describe("buildBreadcrumbList", () => {
  it("numbers items from 1 with absolute URLs", () => {
    const node = buildBreadcrumbList(
      [
        { label: "Inicio", href: "/" },
        { label: "Áreas", href: "/areas" },
      ],
      SITE,
    );

    expect(node.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Áreas", item: `${SITE}/areas` },
    ]);
  });
});

describe("buildAreaService (US-02 CA2)", () => {
  it.each(practiceAreas.map((area) => [area.slug, area] as const))(
    "%s is a Service provided by the firm",
    (slug, area) => {
      expect(buildAreaService(area, SITE, siteConfig.address.city)).toMatchObject({
        "@type": "Service",
        name: area.title,
        description: area.metadata.description,
        url: `${SITE}/areas/${slug}`,
        provider: { "@id": firmId(SITE) },
      });
    },
  );
});
