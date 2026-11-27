"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { errorContent, errorPagesLinks } from "@/content/error-pages";

type ErrorViewProps = {
  retry: () => void;
  /** Next's digest of the error (F5-04), to find it in the logs. Never the message. */
  digest?: string;
};

const linkClass =
  "inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4";

/**
 * Friendly error page (FR-16). It deliberately does not receive the error: nothing internal is
 * shown or logged in the browser (CLAUDE.md §4 and §5). Only Next's digest, a hash that the
 * server log also has (`request.error`), so a report can be matched with it (F5-04). Focus moves to the title so screen
 * reader and keyboard users notice that the content was replaced.
 */
export function ErrorView({ retry, digest }: ErrorViewProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { title, lead, retryLabel, codeLabel } = errorContent;
  const { home, contact } = errorPagesLinks;

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby="error-title" className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <h1
        id="error-title"
        ref={titleRef}
        tabIndex={-1}
        className="text-3xl font-semibold sm:text-5xl"
      >
        {title}
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">{lead}</p>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-12 items-center rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {retryLabel}
        </button>
        <Link href={home.href} className={linkClass}>
          {home.label}
        </Link>
        <Link href={contact.href} className={linkClass}>
          {contact.label}
        </Link>
      </div>
      {digest ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {codeLabel} <code className="font-mono text-foreground">{digest}</code>
        </p>
      ) : null}
    </section>
  );
}
