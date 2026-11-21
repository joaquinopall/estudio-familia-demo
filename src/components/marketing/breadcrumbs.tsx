import { ChevronRight } from "lucide-react";
import Link from "next/link";

export type BreadcrumbItem = { label: string; href: string };

type BreadcrumbsProps = { items: readonly BreadcrumbItem[] };

/** Breadcrumb trail; the last item is the current page (aria-current, not a link). */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Ruta">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {isCurrent ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {item.label}
                </span>
              ) : (
                <>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-6 items-center underline-offset-4 hover:text-primary hover:underline"
                  >
                    {item.label}
                  </Link>
                  <ChevronRight aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
