/**
 * The "Contanos tu caso" section of /contacto (server component). Reachable at #formulario
 * from the CTAs of the site. The form preselects the area from ?area= on the client; while
 * that loads (static render), the same form shows without preselection.
 */
import { Suspense } from "react";

import { siteConfig } from "@/config/site.config";
import { inquiryFormContent as copy } from "@/content/inquiry-form";
import { practiceAreas } from "@/content/practice-areas";
import { publicEnv } from "@/lib/env.public";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

import type { PracticeArea } from "../types";
import { InquiryForm } from "./inquiry-form";
import { InquiryFormFromQuery } from "./inquiry-form-from-query";

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

export function InquiryFormSection() {
  const formProps = {
    turnstileSiteKey: publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    responseTime: siteConfig.responseTime,
    noscriptContacts: <NoscriptContacts />,
  };

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
      <Suspense fallback={<InquiryForm {...formProps} />}>
        <InquiryFormFromQuery {...formProps} areaBySlug={areaBySlug} />
      </Suspense>
    </section>
  );
}
