import type { PracticeAreaContent } from "@/content/practice-areas";
import { cn } from "@/lib/utils";

import { PracticeAreaCard } from "./practice-area-card";

type PracticeAreaGridProps = {
  areas: readonly Pick<PracticeAreaContent, "slug" | "shortTitle" | "summary">[];
  className?: string;
};

/** 1 column on mobile, 2 on tablet, 3 on desktop; an incomplete last row stays centered. */
const itemClass = "w-full sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]";

/** Grid of practice area cards, shared by the home and /areas. */
export function PracticeAreaGrid({ areas, className }: PracticeAreaGridProps) {
  return (
    <ul className={cn("flex flex-wrap justify-center gap-5", className)}>
      {areas.map((area) => (
        <li key={area.slug} className={itemClass}>
          <PracticeAreaCard area={area} />
        </li>
      ))}
    </ul>
  );
}
