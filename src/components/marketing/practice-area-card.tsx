import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { PracticeAreaContent } from "@/content/practice-areas";

type PracticeAreaCardProps = {
  area: Pick<PracticeAreaContent, "slug" | "shortTitle" | "summary">;
};

/**
 * Card linking to an area page. The link lives on the title (short accessible name) and
 * stretches over the whole card with a pseudo-element, so the full card is clickable.
 */
export function PracticeAreaCard({ area }: PracticeAreaCardProps) {
  return (
    <article className="group relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/60 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring">
      <h3 className="text-xl font-semibold text-primary sm:text-2xl">
        <Link
          href={`/areas/${area.slug}`}
          className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
        >
          {area.shortTitle}
        </Link>
      </h3>
      <p className="text-card-foreground">{area.summary}</p>
      <span
        aria-hidden="true"
        className="mt-auto inline-flex items-center gap-1.5 border-t border-border pt-4 text-sm font-semibold text-primary"
      >
        Leer más
        <ArrowRight
          className="size-4 transition-transform motion-safe:group-hover:translate-x-1"
          strokeWidth={1.75}
        />
      </span>
    </article>
  );
}
