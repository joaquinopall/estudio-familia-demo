"use client";

import { MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import type { NavItem } from "@/config/site.config";

import { CtaLink } from "./cta-link";

type MobileMenuProps = { items: NavItem[]; cta: NavItem };

/**
 * Disclosure-pattern menu for small screens: a button with aria-expanded that shows/hides
 * the navigation. Escape closes it and returns focus to the button.
 */
export function MobileMenu({ items, cta }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-muted"
      >
        {open ? (
          <XIcon aria-hidden="true" className="size-5" />
        ) : (
          <MenuIcon aria-hidden="true" className="size-5" />
        )}
        Menú
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-border bg-background shadow-md"
      >
        <nav aria-label="Principal (móvil)" className="px-4 py-4">
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  className="flex min-h-11 items-center rounded-lg px-3 hover:bg-muted"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <CtaLink href={cta.href} onClick={close} className="mt-4 w-full">
            {cta.label}
          </CtaLink>
        </nav>
      </div>
    </div>
  );
}
