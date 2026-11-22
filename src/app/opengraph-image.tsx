import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site.config";
import { brandColors } from "@/lib/seo/brand-colors";
import { ogImage } from "@/lib/seo/og-image";

/**
 * Default Open Graph image for every route (NFR-SEO-01), generated at build time. Uses the
 * default next/og font: next/font files cannot be passed to ImageResponse (TTF/OTF/WOFF only).
 */
export const alt = ogImage.alt;
export const size = { width: ogImage.width, height: ogImage.height };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: brandColors.background,
        borderTop: `16px solid ${brandColors.primary}`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: brandColors.primary,
          }}
        >
          {siteConfig.shortName}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            lineHeight: 1.15,
            color: brandColors.foreground,
            maxWidth: 980,
          }}
        >
          {siteConfig.tagline}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 28,
          color: brandColors.mutedForeground,
        }}
      >
        <div style={{ display: "flex" }}>{siteConfig.address.city}</div>
        {siteConfig.isFictitious ? (
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              background: brandColors.secondary,
              color: brandColors.foreground,
            }}
          >
            Sitio de demostración · estudio ficticio
          </div>
        ) : null}
      </div>
    </div>,
    { ...size },
  );
}
