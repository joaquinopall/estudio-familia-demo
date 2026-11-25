/**
 * Layout of every protected admin page (SPEC §6.2, §6.4 step 2, NFR-SEC-02). Nothing below it
 * renders until requireStaff() confirms an active staff member.
 *
 * Cache Components: reading the session (cookies) needs a <Suspense> boundary, so the check
 * lives in StaffGate. Each page must also call requireStaff() itself: Next may render a page
 * without re-running its layout (client navigation), and the call is cached per request.
 */
import type { Metadata } from "next";
import { Suspense } from "react";

import { adminPanelContent } from "@/content/admin-panel";
import { requireStaff } from "@/features/auth/dal";

export const metadata: Metadata = {
  title: adminPanelContent.metaTitle,
  // robots.txt already blocks /admin; this also keeps it out of any index (FR-14).
  robots: { index: false, follow: false },
};

async function StaffGate({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return children;
}

export default function ProtectedAdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense
      fallback={
        <p role="status" className="mx-auto w-full max-w-5xl px-6 py-10 text-muted-foreground">
          {adminPanelContent.checkingSession}
        </p>
      }
    >
      <StaffGate>{children}</StaffGate>
    </Suspense>
  );
}
