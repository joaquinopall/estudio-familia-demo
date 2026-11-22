"use client";

import { MenuIcon, XIcon } from "lucide-react";
import { type FocusEvent, useEffect, useId, useRef, useState } from "react";

import type { NavItem } from "@/config/site.config";

import { CtaLink } from "./cta-link";
import { NavLinks } from "./nav-links";

type MobileMenuProps = { items: NavItem[]; cta: NavItem };

/**
 * Disclosure-pattern menu for small screens: a button with aria-expanded that shows/hides
 * the navigation. Escape closes it and returns focus to the button. Tabbing or pressing outside
 * closes it too, so it never covers the focused element (WCAG 2.4.11).
 */
export function MobileMenu({ items, cta }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const close = () => setOpen(false);
  // No relatedTarget means focus went nowhere (e.g. Safari does not focus clicked buttons).
  const closeWhenFocusLeaves = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next && !event.currentTarget.contains(next)) close();
  };

  return (
    <div ref={rootRef} onBlur={closeWhenFocusLeaves} className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium hover:bg-muted min-[22.5rem]:gap-2 min-[22.5rem]:px-3"
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
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-7rem)] overflow-y-auto border-b border-border bg-background shadow-md"
      >
        <nav aria-label="Principal (móvil)" className="px-4 py-4">
          <NavLinks items={items} variant="mobile" onNavigate={close} />
          <CtaLink href={cta.href} onClick={close} className="mt-4 w-full">
            {cta.label}
          </CtaLink>
        </nav>
      </div>
    </div>
  );
}
