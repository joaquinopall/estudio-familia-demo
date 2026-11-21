import type { ReactNode } from "react";

import { TableOfContents } from "./table-of-contents";

export type LegalSection = { id: string; title: string; body: ReactNode };

type LegalDocumentProps = { tocLabel: string; sections: readonly LegalSection[] };

/**
 * Long legal text: an index of anchors (sticky beside the text on desktop) and one section
 * per heading, with a comfortable reading width.
 */
export function LegalDocument({ tocLabel, sections }: LegalDocumentProps) {
  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16">
      <TableOfContents label={tocLabel} items={sections} className="h-fit lg:sticky lg:top-6" />
      <div className="max-w-3xl space-y-12">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className="scroll-mt-6"
          >
            <h2
              id={`${section.id}-title`}
              className="text-2xl font-semibold text-primary sm:text-3xl"
            >
              {section.title}
            </h2>
            <div className="mt-4 space-y-4">{section.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
