"use client";

/**
 * Error summary at the top of the form (US-03 CA2): announced right away (role="alert"),
 * focused after a failed attempt, with a link to each invalid field.
 */
import { forwardRef } from "react";

import { inquiryFormContent as copy } from "@/content/inquiry-form";

import { fieldIds } from "./form-field";

export type SummaryItem = { field: string; message: string };

type ErrorSummaryProps = {
  /** General error (rate limit, captcha, server), shown before the field list. */
  message?: string;
  items: readonly SummaryItem[];
};

export const ErrorSummary = forwardRef<HTMLDivElement, ErrorSummaryProps>(function ErrorSummary(
  { message, items },
  ref,
) {
  if (!message && items.length === 0) return null;

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-lg border-l-4 border-destructive bg-secondary p-4 text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {message ? <p className="font-semibold">{message}</p> : null}
      {items.length > 0 ? (
        <>
          <p className={message ? "mt-2" : "font-semibold"}>{copy.errorSummaryTitle}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {items.map(({ field, message: text }) => (
              <li key={field}>
                <a
                  href={`#${fieldIds(field).control}`}
                  className="text-destructive underline underline-offset-4"
                >
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
});
