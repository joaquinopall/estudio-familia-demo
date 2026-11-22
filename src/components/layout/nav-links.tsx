"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import type { NavItem } from "@/config/site.config";
import { cn } from "@/lib/utils";

type NavLinksProps = {
  items: readonly NavItem[];
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
};

const currentClass =
  "aria-[current]:text-primary aria-[current]:underline aria-[current]:decoration-2 aria-[current]:underline-offset-8";

/** "page" on the exact page, "true" on the section that contains it (/areas/divorcio → Áreas). */
function getCurrent(href: string, pathname: string | null) {
  if (pathname === href) return "page" as const;
  if (href !== "/" && pathname?.startsWith(`${href}/`)) return "true" as const;
  return undefined;
}

/**
 * Navigation links that mark where you are. usePathname suspends with Cache Components, and
 * suspending the list itself would replace the links on load (dropping keyboard focus). So only
 * PathnameReader suspends: it renders nothing and the links are always the same DOM nodes.
 */
export function NavLinks({ items, variant, onNavigate }: NavLinksProps) {
  const [pathname, setPathname] = useState<string | null>(null);
  const desktop = variant === "desktop";

  return (
    <>
      <Suspense fallback={null}>
        <PathnameReader onChange={setPathname} />
      </Suspense>
      <ul className={desktop ? "flex items-center nav:gap-1" : "flex flex-col gap-1"}>
        {items.map((item) => (
          // From lg to nav there is no room for "Inicio": the firm name already links home.
          <li key={item.href} className={cn(desktop && item.href === "/" && "hidden nav:block")}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={getCurrent(item.href, pathname)}
              className={cn(
                "min-h-11 items-center rounded-lg hover:bg-muted",
                currentClass,
                desktop
                  ? "inline-flex px-2 text-sm font-medium whitespace-nowrap nav:px-3"
                  : "flex px-3",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function PathnameReader({ onChange }: { onChange: (pathname: string | null) => void }) {
  const pathname = usePathname();

  useEffect(() => {
    onChange(pathname);
  }, [pathname, onChange]);

  return null;
}
