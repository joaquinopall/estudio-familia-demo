"use client";

/**
 * Inquiry form in two steps (US-03, FR-04, FR-05). One <form>: the steps only hide parts of
 * it, so going back loses nothing. Without JavaScript both steps show and the action still
 * validates everything (only Turnstile needs JavaScript: see the <noscript> note).
 *
 * The client validates with the same schema before sending, to show errors at once and not
 * spend rate limit attempts; the server validates again (NFR-SEC-01).
 */
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { inquiryFormContent as copy } from "@/content/inquiry-form";

import { submitInquiry } from "../actions";
import { INQUIRY_FORM_FIELDS, type InquiryFormValues } from "../form-values";
import { HONEYPOT_FIELD } from "../schema";
import type { ContactChannel, PracticeArea } from "../types";
import { applyAreaFromQuery } from "./area-from-query";
import { ErrorSummary } from "./error-summary";
import { focusOutlineClass } from "./form-field";
import {
  DETAILS_FIELDS,
  type FieldErrorMap,
  type Step,
  firstMessages,
  stepOf,
  validateForm,
} from "./form-validation";
import { InquiryConfirmation } from "./inquiry-confirmation";
import { StepContact } from "./step-contact";
import { StepDetails } from "./step-details";
import { TurnstileWidget } from "./turnstile-widget";

export type InquiryFormProps = {
  /** Slug of each area page → its PracticeArea, to preselect it from ?area=<slug>. */
  areaBySlug?: Readonly<Record<string, PracticeArea>>;
  turnstileSiteKey: string;
  /** siteConfig.responseTime, for the confirmation. */
  responseTime: string;
  /** Shown when JavaScript is off: the form cannot pass Turnstile without it. */
  noscriptContacts: React.ReactNode;
};

const subscribe = () => () => {};
/** true once React runs in the browser: steps and conditional questions need JavaScript. */
const useEnhanced = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

export function InquiryForm({
  areaBySlug,
  turnstileSiteKey,
  responseTime,
  noscriptContacts,
}: InquiryFormProps) {
  const [state, formAction, pending] = useActionState(submitInquiry, null);
  const enhanced = useEnhanced();
  const [step, setStep] = useState<Step>("details");
  const [clientErrors, setClientErrors] = useState<FieldErrorMap | null>(null);
  const [chosenChannel, setChosenChannel] = useState<ContactChannel | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [focusRequest, setFocusRequest] = useState({ target: "", count: 0 });

  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const detailsHeadingRef = useRef<HTMLHeadingElement>(null);
  const contactHeadingRef = useRef<HTMLHeadingElement>(null);

  const failed = state && !state.ok ? state : null;
  const values: InquiryFormValues = failed?.values ?? {};

  // ?area=<slug> preselection: on the live <select>, only if still empty (area-from-query.ts).
  useEffect(() => {
    if (formRef.current && areaBySlug) {
      applyAreaFromQuery(formRef.current, window.location.search, areaBySlug);
    }
  }, [areaBySlug]);
  const errors = clientErrors ?? firstMessages(failed?.error.fieldErrors);
  const generalMessage =
    failed && failed.error.code !== "VALIDATION" ? failed.error.message : undefined;

  // A new result from the server: adjust the step during render (React's recommended way to
  // reset state when an input changes), then move the focus in an effect.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    setClientErrors(null);
    setChosenChannel(null);
    if (failed) {
      setStep(stepOf(firstMessages(failed.error.fieldErrors)));
      setTurnstileReset((count) => count + 1); // the token was used or may have expired
    }
    setFocusRequest((request) => ({
      target: state?.ok ? "confirmation" : "summary",
      count: request.count + 1,
    }));
  }

  useEffect(() => {
    if (focusRequest.count === 0) return;
    const targets = {
      summary: summaryRef,
      confirmation: confirmationRef,
      details: detailsHeadingRef,
      contact: contactHeadingRef,
    } as const;
    targets[focusRequest.target as keyof typeof targets]?.current?.focus();
  }, [focusRequest]);

  const requestFocus = (target: string) =>
    setFocusRequest((request) => ({ target, count: request.count + 1 }));

  function goToContact() {
    if (!formRef.current) return;
    const stepErrors = validateForm(formRef.current, DETAILS_FIELDS);
    if (Object.keys(stepErrors).length > 0) {
      setClientErrors(stepErrors);
      requestFocus("summary");
      return;
    }
    setClientErrors(null);
    setStep("contact");
    requestFocus("contact");
  }

  function goBack() {
    setStep("details");
    requestFocus("details");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const allErrors = validateForm(event.currentTarget);
    if (Object.keys(allErrors).length === 0) return setClientErrors(null);
    event.preventDefault(); // nothing is sent: no rate limit attempt spent
    setClientErrors(allErrors);
    setStep(stepOf(allErrors));
    requestFocus("summary");
  }

  if (state?.ok) {
    return (
      <InquiryConfirmation
        ref={confirmationRef}
        reference={state.data.reference}
        doNotContact={state.data.doNotContact}
        responseTime={responseTime}
      />
    );
  }

  const channel = enhanced
    ? (chosenChannel ?? (values.preferredChannel as ContactChannel | undefined) ?? null)
    : undefined;
  const summaryItems = INQUIRY_FORM_FIELDS.filter((field) => errors[field]).map((field) => ({
    field,
    message: errors[field] ?? "",
  }));
  const hidden = (which: Step) => enhanced && step !== which;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="grid gap-8">
      <noscript>
        <div className="rounded-lg border-l-4 border-accent bg-secondary p-4">
          <p>{copy.noscript}</p>
          {noscriptContacts}
        </div>
      </noscript>
      <p className="text-sm text-muted-foreground">{copy.requiredNote}</p>
      <ErrorSummary ref={summaryRef} message={generalMessage} items={summaryItems} />

      <section
        hidden={hidden("details")}
        aria-labelledby="inquiry-step-details"
        className="grid gap-6"
      >
        <h3
          id="inquiry-step-details"
          ref={detailsHeadingRef}
          tabIndex={-1}
          className="text-xl font-semibold outline-none"
        >
          <span className="block text-sm font-normal text-muted-foreground">
            {copy.steps.details.progress}
          </span>
          {copy.steps.details.title}
        </h3>
        <StepDetails values={values} errors={errors} />
        {enhanced ? (
          <Button
            type="button"
            onClick={goToContact}
            className={`min-h-11 px-6 text-base sm:justify-self-start ${focusOutlineClass}`}
          >
            {copy.buttons.next}
          </Button>
        ) : null}
      </section>

      <section
        hidden={hidden("contact")}
        aria-labelledby="inquiry-step-contact"
        className="grid gap-6"
      >
        <h3
          id="inquiry-step-contact"
          ref={contactHeadingRef}
          tabIndex={-1}
          className="text-xl font-semibold outline-none"
        >
          <span className="block text-sm font-normal text-muted-foreground">
            {copy.steps.contact.progress}
          </span>
          {copy.steps.contact.title}
        </h3>
        <StepContact
          values={values}
          errors={errors}
          channel={channel}
          onChannelChange={setChosenChannel}
        />
        {!enhanced || step === "contact" ? (
          <TurnstileWidget siteKey={turnstileSiteKey} resetKey={turnstileReset} />
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          {enhanced ? (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              className={`min-h-11 px-6 text-base ${focusOutlineClass}`}
            >
              {copy.buttons.back}
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={pending}
            className={`min-h-11 px-6 text-base ${focusOutlineClass}`}
          >
            {pending ? copy.buttons.submitting : copy.buttons.submit}
          </Button>
        </div>
      </section>

      {/* Honeypot (SPEC §8.1): invisible, unreachable by keyboard and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor="inquiry-website">{copy.fields.honeypot.label}</label>
        <input
          id="inquiry-website"
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
    </form>
  );
}
