import { cn } from "@/lib/utils";

type TableOfContentsProps = {
  label: string;
  items: readonly { id: string; title: string }[];
  /** Two columns until lg, for short indexes that would fill a phone's first screen. */
  compact?: boolean;
  className?: string;
};

/** In-page index of anchor links (privacy policy, FAQ groups). */
export function TableOfContents({ label, items, compact, className }: TableOfContentsProps) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "rounded-2xl border border-border bg-card",
        compact ? "px-4 py-3 lg:p-5" : "p-5",
        className,
      )}
    >
      <p className="font-sans text-xs font-semibold tracking-[0.14em] text-primary uppercase">
        {label}
      </p>
      <ol className={cn("mt-1", compact && "grid grid-cols-2 gap-x-3 lg:grid-cols-1")}>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="flex min-h-11 items-center py-1 text-sm leading-snug underline-offset-4 hover:text-primary hover:underline"
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
