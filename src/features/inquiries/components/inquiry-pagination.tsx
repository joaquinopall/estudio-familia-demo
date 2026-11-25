/**
 * Pagination of the panel list (US-06 CA2): plain links that keep the filters, so every page
 * has its own shareable URL. "Anterior" and "Siguiente" only appear when there is somewhere
 * to go.
 */
import Link from "next/link";

import { adminPanelContent } from "@/content/admin-panel";

import { buildListHref } from "../list-href";
import type { ListFilters } from "../schema";
import type { InquiryPage } from "../types";

const copy = adminPanelContent.list.pagination;

const linkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border bg-background px-4 text-primary underline-offset-4 hover:underline";

type Props = { filters: ListFilters; result: Pick<InquiryPage, "page" | "totalPages" | "total"> };

export function InquiryPagination({ filters, result }: Props) {
  const { page, totalPages, total } = result;
  const current = { ...filters, page };

  return (
    <nav
      aria-label={copy.label}
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-muted-foreground">
        {copy.page} {page} {copy.of} {totalPages} · {total}{" "}
        {total === 1 ? copy.inquiry : copy.inquiries}
      </p>
      <div className="flex gap-3">
        {page > 1 ? (
          <Link href={buildListHref(current, { page: page - 1 })} rel="prev" className={linkClass}>
            {copy.previous}
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={buildListHref(current, { page: page + 1 })} rel="next" className={linkClass}>
            {copy.next}
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
