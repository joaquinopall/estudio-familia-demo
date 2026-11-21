import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FactLabelProps = { icon: LucideIcon; children: ReactNode; className?: string };

/**
 * Small-caps label with a fine-stroke icon, used for practical data (address, hours...).
 * Deliberately understated: thin line icon, no filled badge behind it.
 */
export function FactLabel({ icon: Icon, children, className }: FactLabelProps) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 font-sans text-xs leading-snug font-semibold tracking-[0.14em] text-primary uppercase",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
      {children}
    </span>
  );
}
