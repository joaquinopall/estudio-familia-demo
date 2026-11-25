/**
 * The part of /admin/login that depends on the request (SPEC §6.4). Rendered inside <Suspense>
 * by the page, as Cache Components requires for cookies and searchParams:
 * - an active staff member who lands on the login goes straight to /admin;
 * - ?error=forbidden (a session that is not active staff) explains it and offers to sign out,
 *   without saying whether the account is inactive or was never staff.
 */
import { redirect } from "next/navigation";

import { adminPanelContent } from "@/content/admin-panel";
import { adminPaths } from "@/lib/admin-paths";

import { getCurrentStaff } from "../dal";
import { SignOutButton } from "./sign-out-button";

const copy = adminPanelContent.forbidden;

export function ForbiddenNotice() {
  return (
    <section
      aria-labelledby="forbidden-title"
      className="rounded-lg border-l-4 border-destructive bg-secondary p-4 text-foreground"
    >
      <h2 id="forbidden-title" className="text-base font-semibold">
        {copy.title}
      </h2>
      <p className="mt-1">{copy.body}</p>
      <div className="mt-3">
        <SignOutButton label={copy.switchAccount} />
      </div>
    </section>
  );
}

export async function LoginSessionCheck({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getCurrentStaff()) redirect(adminPaths.home);
  const { error } = await searchParams;
  return error === "forbidden" ? <ForbiddenNotice /> : null;
}
