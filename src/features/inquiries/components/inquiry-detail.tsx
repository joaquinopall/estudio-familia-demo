/**
 * Detail of one inquiry (US-06 CA3): everything the person sent, how (and whether) to contact
 * them, the status and notes forms, and the history. Server Component; only the two forms are
 * client code. Never the ipHash. Phone and email as plain text (see ContactPlanBox).
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { adminPanelContent } from "@/content/admin-panel";
import { adminPaths } from "@/lib/admin-paths";
import { formatDateTime } from "@/lib/format-date";

import { CONTACT_CHANNEL_LABELS, PRACTICE_AREA_LABELS, URGENCY_LABELS } from "../labels";
import type { InquiryDetail as Detail } from "../types";
import { ContactPlanBox } from "./contact-plan-box";
import { StatusBadge, UrgencyBadge } from "./inquiry-badges";
import { InquiryHistory } from "./inquiry-history";
import { NotesForm } from "./notes-form";
import { StatusForm } from "./status-form";

const copy = adminPanelContent.detail;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-border bg-card p-5">
      <h2 id={id} className="text-xl">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function safeToContactText(inquiry: Detail): string {
  if (inquiry.safeToContact === null) return copy.person.notAsked;
  return inquiry.safeToContact ? copy.person.yes : copy.person.no;
}

export function InquiryDetail({ inquiry, timeZone }: { inquiry: Detail; timeZone: string }) {
  return (
    <div className="grid gap-6">
      <div>
        <Link
          href={adminPaths.home}
          className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
        >
          {copy.backToList}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">{inquiry.reference}</h1>
          <StatusBadge status={inquiry.status} />
          <UrgencyBadge urgency={inquiry.urgency} />
        </div>
        <p className="mt-1 text-muted-foreground">
          {copy.receivedAt}{" "}
          <time dateTime={inquiry.createdAt.toISOString()}>
            {formatDateTime(inquiry.createdAt, timeZone)}
          </time>
        </p>
      </div>

      <ContactPlanBox {...inquiry} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-6">
          <Section id="person-title" title={copy.person.title}>
            <dl className="grid gap-3">
              <Field label={copy.person.fullName}>{inquiry.fullName}</Field>
              <Field label={copy.person.email}>
                <span className="break-all">{inquiry.email}</span>{" "}
                <span className="text-muted-foreground">
                  ({inquiry.emailIsPrivate ? copy.person.emailPrivate : copy.person.emailNotPrivate}
                  )
                </span>
              </Field>
              <Field label={copy.person.phone}>{inquiry.phone ?? copy.person.noPhone}</Field>
              <Field label={copy.person.preferredChannel}>
                {CONTACT_CHANNEL_LABELS[inquiry.preferredChannel]}
              </Field>
              <Field label={copy.person.safeToContact}>{safeToContactText(inquiry)}</Field>
            </dl>
          </Section>

          <Section id="inquiry-title" title={copy.inquiry.title}>
            <dl className="grid gap-3">
              <Field label={copy.inquiry.area}>{PRACTICE_AREA_LABELS[inquiry.area]}</Field>
              <Field label={copy.inquiry.urgency}>{URGENCY_LABELS[inquiry.urgency]}</Field>
              <Field label={copy.inquiry.message}>
                {/* React escapes it; pre-wrap keeps the person's line breaks. */}
                <p className="break-words whitespace-pre-wrap">{inquiry.message}</p>
              </Field>
            </dl>
          </Section>

          <Section id="consent-title" title={copy.consent.title}>
            <p>
              {copy.consent.accepted} {inquiry.privacyPolicyVersion}, {copy.consent.on}{" "}
              <time dateTime={inquiry.consentAt.toISOString()}>
                {formatDateTime(inquiry.consentAt, timeZone)}
              </time>
              .
            </p>
            {inquiry.source ? (
              <p className="mt-1 text-muted-foreground">
                {copy.consent.source}: {inquiry.source}
              </p>
            ) : null}
          </Section>
        </div>

        <div className="grid content-start gap-6">
          <Section id="status-title" title={copy.status.title}>
            <StatusForm id={inquiry.id} status={inquiry.status} />
          </Section>
          <Section id="notes-title" title={copy.notes.title}>
            <NotesForm id={inquiry.id} notes={inquiry.internalNotes} />
          </Section>
          <InquiryHistory history={inquiry.history} timeZone={timeZone} />
        </div>
      </div>
    </div>
  );
}
