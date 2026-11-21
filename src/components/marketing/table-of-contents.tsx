import { cn } from "@/lib/utils";

type TableOfContentsProps = {
  label: string;
  items: readonly { id: string; title: string }[];
  className?: string;
};

/** In-page index of anchor links (privacy policy, FAQ groups). */
export function TableOfContents({ label, items, className }: TableOfContentsProps) {
  return (
    <nav
      aria-label={label}
      className={cn("rounded-2xl border border-border bg-card p-5", className)}
    >
      <p className="font-sans text-xs font-semibold tracking-[0.14em] text-primary uppercase">
        {label}
      </p>
      <ol className="mt-3 space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="inline-flex min-h-8 items-center text-sm underline-offset-4 hover:text-primary hover:underline"
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
