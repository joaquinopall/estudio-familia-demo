/**
 * Next.js Proxy (formerly Middleware). It lives in src/, next to app/: Next only runs it from
 * there (or from the root when there is no src/).
 *
 * It refreshes the Supabase session and sends /admin/* to the login when there is none
 * (SPEC §6.4 step 1, ADR-0014). It is only the first barrier: requireStaff() authorizes every
 * admin page and action (NFR-SEC-02).
 */
import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only the panel: public pages stay static and never get session cookies (NFR-PERF-01).
  // Server Actions are POSTs to the page that uses them, so the panel's actions pass here too.
  matcher: ["/admin/:path*"],
};
