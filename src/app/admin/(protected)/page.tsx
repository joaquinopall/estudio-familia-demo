/**
 * /admin (FR-10). Minimal until F4-04 replaces it with the inquiry list. It calls
 * requireStaff() even though the layout does (NFR-SEC-02: every page).
 */
import { adminPanelContent } from "@/content/admin-panel";
import { requireStaff } from "@/features/auth/dal";

export default async function AdminHomePage() {
  const staff = await requireStaff();
  const content = adminPanelContent.home;

  return (
    <main id="contenido" className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="font-heading text-3xl">{content.title}</h1>
      <p className="mt-2 text-muted-foreground">
        {content.signedInAs} {staff.fullName}.
      </p>
      <p className="mt-6">{content.placeholder}</p>
    </main>
  );
}
