import { Clock, LockKeyhole, Mail, MapPin, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { CtaLink } from "@/components/layout/cta-link";
import type { SiteConfig } from "@/config/site.config";
import type { ContactDetailsLabels } from "@/content/contact-page";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

import { FactLabel } from "./fact-label";

type ContactDetailsProps = Pick<
  SiteConfig,
  "contact" | "address" | "hours" | "confidentialityNote" | "responseTime"
> & {
  labels: ContactDetailsLabels;
  /** Shown right under the WhatsApp button (e.g. the urgent note). */
  notice?: ReactNode;
};

const linkClass =
  "inline-flex min-h-11 items-center underline decoration-border underline-offset-4 hover:decoration-primary";

/**
 * Contact channels (FR-13, SPEC §11.2/§11.3): WhatsApp first, then phone, email, address with a
 * map link (no embed: CSP and no third-party cookies), hours and confidentiality.
 */
export function ContactDetails({
  contact,
  address,
  hours,
  confidentialityNote,
  responseTime,
  labels,
  notice,
}: ContactDetailsProps) {
  return (
    <section
      aria-labelledby="contact-details-title"
      className="rounded-2xl border border-border bg-card p-4 sm:p-6"
    >
      <h2 id="contact-details-title" className="text-2xl font-semibold text-primary sm:text-3xl">
        {labels.title}
      </h2>

      <CtaLink
        href={buildWhatsAppUrl(contact.whatsappNumber, contact.whatsappMessage)}
        target="_blank"
        rel="noopener noreferrer"
        size="lg"
        className="mt-3 w-full px-3 sm:w-auto sm:px-6"
      >
        {labels.whatsappLabel}
        <span className="sr-only"> (se abre en una pestaña nueva)</span>
      </CtaLink>
      {notice ? <div className="mt-4">{notice}</div> : null}

      <dl className="mt-6 divide-y divide-border border-t border-border">
        <Detail icon={Phone} label={labels.phoneLabel}>
          <a href={`tel:+${contact.phoneE164}`} className={linkClass}>
            {contact.phoneDisplay}
          </a>
        </Detail>

        <Detail icon={Mail} label={labels.emailLabel}>
          <a href={`mailto:${contact.email}`} className={linkClass}>
            {contact.email}
          </a>
        </Detail>

        <Detail icon={MapPin} label={labels.addressLabel}>
          <address className="not-italic">
            {address.street}, {address.city}
          </address>
          <a
            href={address.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-sm font-semibold text-primary ${linkClass}`}
          >
            {labels.mapLinkLabel}
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
        </Detail>

        <Detail icon={Clock} label={labels.hoursLabel}>
          <ul className="space-y-1">
            {hours.map((entry) => (
              <li key={entry.days}>
                <span className="font-medium">{entry.days}:</span> {entry.hours}
              </li>
            ))}
          </ul>
        </Detail>

        <Detail icon={LockKeyhole} label={labels.confidentialityLabel}>
          <p className="font-medium">{confidentialityNote}</p>
          <p className="mt-1 text-sm text-muted-foreground">{responseTime}</p>
        </Detail>
      </dl>
    </section>
  );
}

type DetailProps = { icon: typeof Phone; label: string; children: ReactNode };

function Detail({ icon, label, children }: DetailProps) {
  return (
    <div className="py-4">
      <dt>
        <FactLabel icon={icon}>{label}</FactLabel>
      </dt>
      <dd className="mt-2">{children}</dd>
    </div>
  );
}
