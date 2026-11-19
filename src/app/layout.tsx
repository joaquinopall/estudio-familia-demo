import type { Metadata } from "next";
import { Lora, Plus_Jakarta_Sans } from "next/font/google";

import { siteConfig } from "@/config/site.config";
import { publicEnv } from "@/lib/env.public";

import "./globals.css";

// Headings: Lora (warm serif). Body: Plus Jakarta Sans (legible sans). SPEC §11.1.
const lora = Lora({ subsets: ["latin"], display: "swap", variable: "--font-lora" });
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: { default: siteConfig.name, template: `%s · ${siteConfig.shortName}` },
  description: siteConfig.description,
  applicationName: siteConfig.shortName,
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${lora.variable} ${plusJakartaSans.variable}`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
