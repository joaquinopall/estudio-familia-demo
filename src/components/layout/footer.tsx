import Link from "next/link";

import type { SiteConfig } from "@/config/site.config";

import { SafetyNotice } from "./safety-notice";

type FooterProps = { config: SiteConfig };

const linkClass = "inline-flex min-h-11 items-center underline-offset-4 hover:underline";

/** Footer with the trust signals of SPEC §11.2 and the legal disclaimer of §11.4. */
export function Footer({ config }: FooterProps) {
  const { address, contact, hours, professionals, legal } = config;

  return (
    <footer className="mt-auto border-t border-border bg-secondary text-secondary-foreground">
      <SafetyNotice />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Not <section>: named regions here would clash with "Contacto" and "Profesionales". */}
        <div>
          <h2 className="text-lg font-semibold">{config.shortName}</h2>
          <p className="mt-2 text-sm">{config.tagline}</p>
          <p className="mt-3 text-sm font-medium">{config.confidentialityNote}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Profesionales</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {professionals.map((professional) => (
              <li key={professional.name}>
                <span className="block font-medium">{professional.name}</span>
                <span className="block text-muted-foreground">{professional.registration}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Contacto</h2>
          <address className="mt-1 text-sm not-italic">
            <p>
              <a
                href={address.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {address.street}, {address.city}
                <span className="sr-only"> (abre el mapa en una pestaña nueva)</span>
              </a>
            </p>
            <p>
              Teléfono:{" "}
              <a href={`tel:+${contact.phoneE164}`} className={linkClass}>
                {contact.phoneDisplay}
              </a>
            </p>
            <p>
              Email:{" "}
              <a href={`mailto:${contact.email}`} className={linkClass}>
                {contact.email}
              </a>
            </p>
          </address>
          <p className="mt-2 text-sm text-muted-foreground">{config.responseTime}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Horarios</h2>
          <dl className="mt-2 space-y-1 text-sm">
            {hours.map((entry) => (
              <div key={entry.days}>
                <dt className="font-medium">{entry.days}</dt>
                <dd>{entry.hours}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>{legal.disclaimer}</p>
          <nav aria-label="Legal">
            <Link
              href={legal.privacyHref}
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              Política de privacidad
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
