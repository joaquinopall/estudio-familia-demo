import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type BreadcrumbItem = { label: string; href: string };

type BreadcrumbsProps = { items: readonly BreadcrumbItem[] };

/**
 * Breadcrumb trail; the last item is the current page (aria-current, not a link). On phones that
 * item is only for screen readers: the h1 right below says the same. The negative margin gives
 * the links 44px targets without making the header taller.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Ruta">
      <ol className="-my-2.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li
              key={item.href}
              className={cn("flex items-center gap-1.5", isCurrent && "sr-only sm:not-sr-only")}
            >
              {isCurrent ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {item.label}
                </span>
              ) : (
                <>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 min-w-11 items-center underline-offset-4 hover:text-primary hover:underline"
                  >
                    {item.label}
                  </Link>
                  <ChevronRight
                    aria-hidden="true"
                    className={cn("size-3.5", index === items.length - 2 && "hidden sm:block")}
                    strokeWidth={1.5}
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
