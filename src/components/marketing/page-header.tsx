import type { ReactNode } from "react";

import { type BreadcrumbItem, Breadcrumbs } from "./breadcrumbs";

type PageHeaderProps = {
  /** Referenced by the section's aria-labelledby. */
  id: string;
  breadcrumbs: readonly BreadcrumbItem[];
  title: string;
  /** One string per paragraph. */
  lead?: string | readonly string[];
  /** Extra content under the lead, e.g. a call to action. */
  children?: ReactNode;
};

/** Opening block of the inner public pages: breadcrumbs, the page h1 and its lead. */
export function PageHeader({ id, breadcrumbs, title, lead, children }: PageHeaderProps) {
  const paragraphs = lead === undefined ? [] : typeof lead === "string" ? [lead] : lead;

  return (
    <section aria-labelledby={id} className="bg-secondary/60">
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:pt-10 sm:pb-16">
        <Breadcrumbs items={breadcrumbs} />
        <h1 id={id} className="mt-6 max-w-3xl text-3xl font-semibold text-foreground sm:text-5xl">
          {title}
        </h1>
        {paragraphs.length > 0 ? (
          <div className="mt-5 max-w-2xl space-y-4 text-lg text-muted-foreground">
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
