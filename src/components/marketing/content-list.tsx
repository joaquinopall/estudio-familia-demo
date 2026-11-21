import { cn } from "@/lib/utils";

type ContentListProps = { items: readonly string[]; className?: string };

/** Bulleted list for plain-text content (e.g. "¿Cuándo consultar?", documentation). */
export function ContentList({ items, className }: ContentListProps) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-primary"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
