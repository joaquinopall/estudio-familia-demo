/**
 * /admin: the inquiry list (US-06 CA2, FR-10, SPEC §6.4 step 3). Server-rendered and paginated
 * on the server; the filters come from the URL (listFiltersSchema ignores invalid values), so a
 * filtered list can be shared. It calls requireStaff() even though the layout does
 * (NFR-SEC-02: every page).
 */
import { siteConfig } from "@/config/site.config";
import { adminPanelContent } from "@/content/admin-panel";
import { requireStaff } from "@/features/auth/dal";
import { InquiryFilters } from "@/features/inquiries/components/inquiry-filters";
import { InquiryPagination } from "@/features/inquiries/components/inquiry-pagination";
import { InquiryTable } from "@/features/inquiries/components/inquiry-table";
import { type ListFilters, listFiltersSchema } from "@/features/inquiries/schema";
import { getInquiryService } from "@/features/inquiries/server";
import { logger } from "@/lib/logger";

const copy = adminPanelContent.list;

/**
 * Logs only the error name (Prisma messages may echo the search text) and throws a bare error
 * for the panel's error boundary, so no cause chain reaches the server log either.
 */
async function listOrFail(filters: ListFilters) {
  try {
    return await getInquiryService().listInquiries(filters);
  } catch (error) {
    logger.error("inquiry.list_failed", { error });
    throw new Error("inquiry.list_failed");
  }
}

export default async function AdminInquiriesPage({ searchParams }: PageProps<"/admin">) {
  await requireStaff();
  const filters = listFiltersSchema.parse(await searchParams);
  const result = await listOrFail(filters);
  const filtered = Boolean(filters.status || filters.area || filters.urgency || filters.q);

  return (
    <main id="contenido" className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-10">
      <h1 className="text-3xl">{copy.title}</h1>
      <InquiryFilters filters={filters} />
      {result.items.length > 0 ? (
        <>
          <InquiryTable items={result.items} timeZone={siteConfig.timeZone} />
          <InquiryPagination filters={filters} result={result} />
        </>
      ) : (
        <p role="status" className="rounded-lg border border-border bg-card p-6 text-foreground">
          {filtered ? copy.empty.noMatches : copy.empty.none}
        </p>
      )}
    </main>
  );
}
