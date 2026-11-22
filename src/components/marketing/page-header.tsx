import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { type BreadcrumbItem, Breadcrumbs } from "./breadcrumbs";

type PageHeaderProps = {
  /** Referenced by the section's aria-labelledby. */
  id: string;
  breadcrumbs: readonly BreadcrumbItem[];
  title: string;
  /** One string per paragraph. */
  lead?: string | readonly string[];
  /** Less bottom space, when the page's main action comes right after the header. */
  compact?: boolean;
  /** Extra content under the lead, e.g. a call to action. */
  children?: ReactNode;
};

/** Opening block of the inner public pages: breadcrumbs, the page h1 and its lead. */
export function PageHeader({ id, breadcrumbs, title, lead, compact, children }: PageHeaderProps) {
  const paragraphs = lead === undefined ? [] : typeof lead === "string" ? [lead] : lead;

  return (
    <section aria-labelledby={id} className="bg-secondary/60">
      <div
        className={cn(
          "mx-auto max-w-6xl px-4 pt-3 sm:pt-10",
          compact ? "pb-4 sm:pb-6" : "pb-8 sm:pb-16",
        )}
      >
        <Breadcrumbs items={breadcrumbs} />
        <h1
          id={id}
          className="mt-3 max-w-3xl text-[1.625rem] font-semibold text-foreground min-[22.5rem]:text-3xl sm:mt-6 sm:text-5xl"
        >
          {title}
        </h1>
        {paragraphs.length > 0 ? (
          <div className="mt-3 max-w-2xl space-y-3 text-base leading-normal text-muted-foreground sm:mt-5 sm:space-y-4 sm:text-lg sm:leading-relaxed">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
