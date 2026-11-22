import Link from "next/link";

import { errorPagesLinks, notFoundContent } from "@/content/error-pages";

import { CtaLink } from "./cta-link";

/** Friendly 404 (FR-16). Next sends not-found files with every route: keep it free of client JS. */
export function NotFoundView() {
  const { eyebrow, title, lead } = notFoundContent;
  const { home, contact } = errorPagesLinks;

  return (
    <section aria-labelledby="not-found-title" className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
      <h1 id="not-found-title" className="mt-4 text-3xl font-semibold sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">{lead}</p>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <CtaLink href={contact.href} size="lg">
          {contact.label}
        </CtaLink>
        <Link
          href={home.href}
          className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
        >
          {home.label}
        </Link>
      </div>
    </section>
  );
}
