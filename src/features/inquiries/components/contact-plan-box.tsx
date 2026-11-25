/**
 * "Cómo contactar" (US-03 CA6, CA7, SPEC §11.5): the first thing the firm reads in the detail.
 * It comes from planContact (via the service), the same rule as the emails and the list.
 *
 * Phone and email are plain text on purpose, never tel:, wa.me or mailto: links: a careless tap
 * could start contact through a channel the person said is not safe.
 */
import { adminPanelContent } from "@/content/admin-panel";

import { CONTACT_CHANNEL_LABELS } from "../labels";
import type { InquiryDetail } from "../types";

const copy = adminPanelContent.detail.contact;

type Props = Pick<
  InquiryDetail,
  "doNotContact" | "contactChannel" | "preferredChannel" | "phone" | "email"
>;

export function ContactPlanBox({
  doNotContact,
  contactChannel,
  preferredChannel,
  phone,
  email,
}: Props) {
  if (doNotContact || !contactChannel) {
    return (
      <section
        aria-labelledby="contact-plan-title"
        className="rounded-lg border-l-4 border-destructive bg-secondary p-4 text-foreground"
      >
        <h2 id="contact-plan-title" className="text-lg font-semibold text-destructive">
          {copy.doNotContactTitle}
        </h2>
        <p className="mt-1">{copy.doNotContactBody}</p>
      </section>
    );
  }

  const value = contactChannel === "EMAIL" ? email : phone;
  return (
    <section
      aria-labelledby="contact-plan-title"
      className="rounded-lg border-l-4 border-primary bg-secondary p-4 text-foreground"
    >
      <h2 id="contact-plan-title" className="text-lg font-semibold">
        {copy.title}
      </h2>
      <p className="mt-1">
        {copy.contactBy} {CONTACT_CHANNEL_LABELS[contactChannel]}:{" "}
        <span className="font-semibold break-all">{value}</span>
      </p>
      {contactChannel !== preferredChannel ? (
        <p className="mt-1 text-sm text-muted-foreground">{copy.fallbackNote}</p>
      ) : null}
    </section>
  );
}
