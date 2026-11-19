import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type CtaLinkProps = ComponentProps<typeof Link> & { size?: "md" | "lg" };

/** Call-to-action link: the only place the warm accent color is used (SPEC §11.1). */
export function CtaLink({ className, size = "md", ...props }: CtaLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-accent font-semibold text-accent-foreground transition-colors hover:bg-accent/90",
        size === "md" ? "min-h-11 px-4 text-sm" : "min-h-12 px-6 text-base",
        className,
      )}
      {...props}
    />
  );
}
