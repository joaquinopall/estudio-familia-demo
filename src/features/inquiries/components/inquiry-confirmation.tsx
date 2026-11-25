"use client";

/**
 * Confirmation after sending (US-03 CA3). Without a safe channel it does not promise contact:
 * it asks the person to keep the reference and reach the firm when it is safe (US-03 CA7).
 */
import { forwardRef } from "react";

import { inquiryFormContent as copy } from "@/content/inquiry-form";

type InquiryConfirmationProps = {
  reference: string;
  doNotContact: boolean;
  /** siteConfig.responseTime. */
  responseTime: string;
};

export const InquiryConfirmation = forwardRef<HTMLDivElement, InquiryConfirmationProps>(
  function InquiryConfirmation({ reference, doNotContact, responseTime }, ref) {
    const { confirmation } = copy;
    return (
      <div
        ref={ref}
        tabIndex={-1}
        aria-labelledby="inquiry-confirmation-title"
        className="rounded-lg border-l-4 border-primary bg-secondary p-6 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <h3 id="inquiry-confirmation-title" className="text-xl font-semibold text-primary">
          {confirmation.title}
        </h3>
        <p className="mt-4 text-muted-foreground">{confirmation.referenceLabel}</p>
        <p className="text-2xl font-bold tracking-wider text-foreground">{reference}</p>
        {doNotContact ? (
          <p className="mt-4 text-foreground">{confirmation.doNotContactNote}</p>
        ) : (
          <>
            <p className="mt-4 text-foreground">
              {confirmation.contactNote} {responseTime}
            </p>
            <p className="mt-2 text-muted-foreground">{confirmation.keepReference}</p>
          </>
        )}
      </div>
    );
  },
);
