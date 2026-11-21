import { BadgeCheck, Clock, LockKeyhole, MapPin } from "lucide-react";
import type { ReactNode } from "react";

import type { SiteConfig } from "@/config/site.config";

import { FactLabel } from "./fact-label";

type TrustBarProps = Pick<
  SiteConfig,
  "professionals" | "address" | "hours" | "confidentialityNote" | "responseTime"
>;

/**
 * Trust signals of SPEC §11.2 / US-01 CA3: registrations, address, hours, confidentiality.
 * One "index card" split by hairlines (stacked on mobile, 2x2 on tablet, a row on desktop)
 * instead of four floating cards.
 */
export function TrustBar({
  professionals,
  address,
  hours,
  confidentialityNote,
  responseTime,
}: TrustBarProps) {
  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-2 lg:grid-cols-4">
      <TrustCell icon={BadgeCheck} title="Profesionales matriculados">
        <ul className="space-y-3">
          {professionals.map((professional) => (
            <li key={professional.name}>
              <span className="block font-heading text-lg font-semibold">{professional.name}</span>
              <span className="block text-sm text-muted-foreground">
                {professional.registration}
              </span>
            </li>
          ))}
        </ul>
      </TrustCell>

      <TrustCell icon={MapPin} title="Dónde estamos">
        <address className="not-italic">
          <a
            href={address.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-border underline-offset-4 hover:decoration-primary"
          >
            {address.street}, {address.city}
            <span className="sr-only"> (abre el mapa en una pestaña nueva)</span>
          </a>
        </address>
      </TrustCell>

      <TrustCell icon={Clock} title="Horarios">
        <dl className="space-y-2">
          {hours.map((entry) => (
            <div key={entry.days}>
              <dt className="font-medium">{entry.days}</dt>
              <dd className="text-sm text-muted-foreground">{entry.hours}</dd>
            </div>
          ))}
        </dl>
      </TrustCell>

      <TrustCell icon={LockKeyhole} title="Confidencialidad">
        <p className="font-medium">{confidentialityNote}</p>
        <p className="mt-2 text-sm text-muted-foreground">{responseTime}</p>
      </TrustCell>
    </div>
  );
}

type TrustCellProps = { icon: typeof BadgeCheck; title: string; children: ReactNode };

/** Each cell draws its own top/left hairline so the grid reads as one card at any width. */
function TrustCell({ icon, title, children }: TrustCellProps) {
  return (
    <div className="border-border p-6 not-first:border-t sm:even:border-l sm:nth-2:border-t-0 lg:not-first:border-t-0 lg:not-first:border-l">
      <h3>
        <FactLabel icon={icon}>{title}</FactLabel>
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}
