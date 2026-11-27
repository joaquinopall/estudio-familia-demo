/**
 * Layout of every protected admin page (SPEC §6.2, §6.4 step 2, NFR-SEC-02). Nothing below it
 * renders until requireStaff() confirms an active staff member. noindex comes from the admin
 * layout above it.
 *
 * Cache Components: reading the session (cookies) needs a <Suspense> boundary, so the check
 * lives in StaffGate. Each page must also call requireStaff() itself: Next may render a page
 * without re-running its layout (client navigation), and the call is cached per request.
 */
import { Suspense } from "react";

import { adminPanelContent as copy } from "@/content/admin-panel";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireStaff } from "@/features/auth/dal";

async function StaffGate({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <>
      <section aria-label={copy.sessionRegion} className="border-b border-border bg-secondary">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-2">
          <p className="text-sm text-muted-foreground">
            {copy.signedInAs} <span className="font-medium text-foreground">{staff.fullName}</span>
          </p>
          <SignOutButton label={copy.signOut} />
        </div>
      </section>
      {children}
    </>
  );
}

export default function ProtectedAdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense
      fallback={
        <p role="status" className="mx-auto w-full max-w-5xl px-6 py-10 text-muted-foreground">
          {copy.checkingSession}
        </p>
      }
    >
      <StaffGate>{children}</StaffGate>
    </Suspense>
  );
}
