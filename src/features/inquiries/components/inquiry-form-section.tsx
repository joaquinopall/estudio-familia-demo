/**
 * The "Contanos tu caso" section of /contacto (server component). Reachable at #formulario
 * from the CTAs of the site. One form, rendered statically: it preselects the area from
 * ?area= on the client without replacing itself (see area-from-query.ts).
 */
import { siteConfig } from "@/config/site.config";
import { inquiryFormContent as copy } from "@/content/inquiry-form";
import { practiceAreas } from "@/content/practice-areas";
import { publicEnv } from "@/lib/env.public";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

import type { PracticeArea } from "../types";
import { InquiryForm } from "./inquiry-form";

/** Built on the server, so the browser does not load the texts of every area. */
const areaBySlug: Record<string, PracticeArea> = Object.fromEntries(
  practiceAreas.map((area) => [area.slug, area.inquiryArea]),
);

function NoscriptContacts() {
  const { contact } = siteConfig;
  const linkClass = "font-semibold text-primary underline underline-offset-4";
  return (
    <ul className="mt-2 grid gap-1">
      <li>
        <a
          href={buildWhatsAppUrl(contact.whatsappNumber, contact.whatsappMessage)}
          className={linkClass}
        >
          WhatsApp
        </a>
      </li>
      <li>
        <a href={`tel:+${contact.phoneE164}`} className={linkClass}>
          {contact.phoneDisplay}
        </a>
      </li>
      <li>
        <a href={`mailto:${contact.email}`} className={linkClass}>
          {contact.email}
        </a>
      </li>
    </ul>
  );
}

/** `demoMode` comes from NEXT_PUBLIC_DEMO_MODE; a parameter only so tests can set it. */
export function InquiryFormSection({
  demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE,
}: { demoMode?: boolean } = {}) {
  return (
    <section
      id="formulario"
      aria-labelledby="inquiry-form-title"
      className="relative scroll-mt-24 rounded-2xl border border-border bg-card p-4 sm:p-8 gutter:scroll-mt-6"
    >
      <h2 id="inquiry-form-title" className="text-2xl font-semibold text-primary sm:text-3xl">
        {copy.title}
      </h2>
      <p className="mt-3 mb-6 text-muted-foreground">{copy.intro}</p>
      {demoMode ? (
        <div role="note" className="mb-6 rounded-lg border-l-4 border-accent bg-secondary p-4">
          <p className="font-semibold">{copy.demoNotice.title}</p>
          <p className="mt-1">{copy.demoNotice.body}</p>
        </div>
      ) : null}
      <InquiryForm
        areaBySlug={areaBySlug}
        turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        responseTime={siteConfig.responseTime}
        noscriptContacts={<NoscriptContacts />}
      />
    </section>
  );
}
