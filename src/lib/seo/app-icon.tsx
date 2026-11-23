import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site.config";

import { brandColors } from "./brand-colors";

/**
 * Browser and home-screen icon (FR-03): the firm's monogram, ivory on the primary color.
 * Generated at build time, so a new firm only changes `siteConfig.monogram`. The home-screen
 * icon stays square: iOS and Android round it themselves.
 */
export function renderAppIcon(size: number, { rounded }: { rounded: boolean }) {
  const scale = siteConfig.monogram.length > 1 ? 0.5 : 0.68;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: brandColors.primary,
        color: brandColors.background,
        borderRadius: rounded ? size * 0.2 : 0,
        fontSize: size * scale,
      }}
    >
      {siteConfig.monogram}
    </div>,
    { width: size, height: size },
  );
}
