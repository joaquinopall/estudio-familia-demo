/**
 * URLs of the panel list (US-06 CA2): the filters live in the URL, so a filtered page can be
 * shared and reloaded. Pure, so pagination and filter links are built and tested in one place.
 * Parameter names match listFiltersSchema.
 */
import { adminPaths } from "@/lib/admin-paths";

import type { ListFilters } from "./schema";

const FILTER_KEYS = ["status", "area", "urgency", "q"] as const;

/**
 * The list URL for `current` with `changes` applied. Changing any filter goes back to page 1
 * (the old page may not exist with the new filters). Empty values and page 1 are left out.
 */
export function buildListHref(current: ListFilters, changes: Partial<ListFilters> = {}): string {
  const filterChanged = FILTER_KEYS.some((key) => key in changes);
  const next: ListFilters = {
    ...current,
    ...changes,
    page: changes.page ?? (filterChanged ? 1 : current.page),
  };

  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = next[key];
    if (value) params.set(key, value);
  }
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `${adminPaths.home}?${query}` : adminPaths.home;
}
