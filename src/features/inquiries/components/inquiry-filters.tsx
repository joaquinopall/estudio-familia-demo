/**
 * Filters of the panel list (US-06 CA2). A plain GET form: the browser puts the fields in the
 * URL, so it works without JavaScript and a filtered list can be shared or reloaded. Submitting
 * always lands on page 1 (no page field).
 */
import Link from "next/link";

import { controlClass, focusOutlineClass } from "@/components/forms/field-styles";
import { Button } from "@/components/ui/button";
import { adminPanelContent } from "@/content/admin-panel";
import { adminPaths } from "@/lib/admin-paths";

import { INQUIRY_STATUS_LABELS, PRACTICE_AREA_LABELS, URGENCY_SHORT_LABELS } from "../labels";
import { type ListFilters, SEARCH_MAX_LENGTH } from "../schema";
import { INQUIRY_STATUSES, PRACTICE_AREAS, URGENCIES } from "../types";

const copy = adminPanelContent.list.filters;

const ids = {
  status: "filter-status",
  area: "filter-area",
  urgency: "filter-urgency",
  q: "filter-q",
  qHint: "filter-q-hint",
} as const;

type SelectProps = {
  id: string;
  name: string;
  label: string;
  allLabel: string;
  value: string | undefined;
  options: readonly { value: string; label: string }[];
};

function FilterSelect({ id, name, label, allLabel, value, options }: SelectProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>
      <select id={id} name={name} defaultValue={value ?? ""} className={controlClass}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const optionsOf = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] }));

export function InquiryFilters({ filters }: { filters: ListFilters }) {
  const hasFilters = Boolean(filters.status || filters.area || filters.urgency || filters.q);

  return (
    <form method="get" action={adminPaths.home} role="search" aria-label={copy.legend}>
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.5fr)]">
        <legend className="sr-only">{copy.legend}</legend>
        <FilterSelect
          id={ids.status}
          name="status"
          label={copy.status}
          allLabel={copy.allStatuses}
          value={filters.status}
          options={optionsOf(INQUIRY_STATUSES, INQUIRY_STATUS_LABELS)}
        />
        <FilterSelect
          id={ids.area}
          name="area"
          label={copy.area}
          allLabel={copy.allAreas}
          value={filters.area}
          options={optionsOf(PRACTICE_AREAS, PRACTICE_AREA_LABELS)}
        />
        <FilterSelect
          id={ids.urgency}
          name="urgency"
          label={copy.urgency}
          allLabel={copy.allUrgencies}
          value={filters.urgency}
          options={optionsOf(URGENCIES, URGENCY_SHORT_LABELS)}
        />
        <div>
          <label htmlFor={ids.q} className="mb-1 block text-sm font-medium text-foreground">
            {copy.search}
          </label>
          <input
            id={ids.q}
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            maxLength={SEARCH_MAX_LENGTH}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={ids.qHint}
            className={controlClass}
          />
          <p id={ids.qHint} className="mt-1 text-sm text-muted-foreground">
            {copy.searchHint}
          </p>
        </div>
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button type="submit" className={`min-h-11 px-6 text-base ${focusOutlineClass}`}>
          {copy.submit}
        </Button>
        {hasFilters ? (
          <Link
            href={adminPaths.home}
            className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
          >
            {copy.clear}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
