/**
 * The part of /admin/login that depends on the request (SPEC §6.4). Rendered inside <Suspense>
 * by the page, as Cache Components requires for cookies and searchParams:
 * - an active staff member who lands on the login goes straight to `next` (F4-06) or /admin;
 * - a valid `next` becomes a hidden field of the login form (joined with the form attribute,
 *   so the form itself stays in the static shell and works without JavaScript);
 * - ?error=forbidden (a session that is not active staff) explains it and offers to sign out,
 *   without saying whether the account is inactive or was never staff.
 */
import { redirect } from "next/navigation";

import { adminPanelContent } from "@/content/admin-panel";
import { NEXT_PARAM, adminPaths, safeNextPath } from "@/lib/admin-paths";

import { getCurrentStaff } from "../dal";
import { LOGIN_FORM_ID } from "./login-ids";
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
  const params = await searchParams;
  // Arrays (?next=a&next=b) and anything outside the panel are ignored (SPEC §10.2).
  const next = safeNextPath(params[NEXT_PARAM]);

  if (await getCurrentStaff()) redirect(next ?? adminPaths.home);

  return (
    <>
      {next ? <input type="hidden" name={NEXT_PARAM} value={next} form={LOGIN_FORM_ID} /> : null}
      {params.error === "forbidden" ? <ForbiddenNotice /> : null}
    </>
  );
}
