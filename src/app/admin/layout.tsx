/**
 * Layout of the whole admin panel: login and protected pages (FR-10, FR-14). A plain header,
 * without the public shell (no demo banner, WhatsApp or footer): it is a work tool.
 * Each page renders its own <main id="contenido">.
 */
import type { Metadata } from "next";

import { siteConfig } from "@/config/site.config";
import { adminPanelContent } from "@/content/admin-panel";

export const metadata: Metadata = {
  title: adminPanelContent.metaTitle,
  // robots.txt already blocks /admin; this also keeps every panel page out of any index.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <p className="mx-auto flex w-full max-w-5xl items-baseline gap-2 px-6 py-4">
          <span className="font-heading text-lg font-semibold text-primary">
            {siteConfig.shortName}
          </span>
          <span className="text-muted-foreground">· {adminPanelContent.panelLabel}</span>
        </p>
      </header>
      {children}
    </div>
  );
}
