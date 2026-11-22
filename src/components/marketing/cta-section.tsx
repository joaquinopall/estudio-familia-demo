import { CtaLink } from "@/components/layout/cta-link";
import type { NavItem } from "@/config/site.config";

type CtaSectionProps = {
  id: string;
  title: string;
  lead: string;
  cta: NavItem;
  /** Shown under the button, e.g. the expected response time. */
  note: string;
};

/**
 * Closing call to action. The band is painted with the primary color, which is also the focus
 * ring color: inside it, the ring switches to primary-foreground or it would be invisible.
 */
export function CtaSection({ id, title, lead, cta, note }: CtaSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className="bg-primary text-primary-foreground [--ring:var(--primary-foreground)]"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
        <h2 id={id} className="text-3xl font-semibold sm:text-4xl">
          {title}
        </h2>
        <p className="text-lg">{lead}</p>
        <CtaLink href={cta.href} size="lg">
          {cta.label}
        </CtaLink>
        <p className="text-sm">{note}</p>
      </div>
    </section>
  );
}
