/**
 * Step 2 of the inquiry form: who writes and how to reach them safely (US-03 CA1, CA6, CA7,
 * US-07 CA2). The safety question only appears for phone channels when JavaScript runs;
 * without it, it is always shown and the server ignores it for email.
 */
import Link from "next/link";

import { inquiryFormContent as copy } from "@/content/inquiry-form";

import type { InquiryFormValues } from "../form-values";
import { CONTACT_CHANNEL_LABELS } from "../labels";
import { CONTACT_CHANNELS, type ContactChannel, isPhoneChannel } from "../types";
import { ChoiceGroup, Field, FieldError, controlClass, describedBy, fieldIds } from "./form-field";
import type { FieldErrorMap } from "./form-validation";

type StepContactProps = {
  values: InquiryFormValues;
  errors: FieldErrorMap;
  /** Selected channel; null until chosen. Undefined while JavaScript has not run. */
  channel: ContactChannel | null | undefined;
  onChannelChange: (channel: ContactChannel) => void;
};

const textInput = (
  name: "fullName" | "email" | "phone",
  values: InquiryFormValues,
  errors: FieldErrorMap,
  extra: { type: string; autoComplete: string; hasHint?: boolean; required?: boolean },
) => (
  <input
    id={fieldIds(name).control}
    name={name}
    type={extra.type}
    autoComplete={extra.autoComplete}
    defaultValue={values[name] ?? ""}
    aria-invalid={errors[name] ? true : undefined}
    aria-describedby={describedBy(name, Boolean(extra.hasHint), errors[name])}
    aria-required={extra.required ? "true" : undefined}
    className={controlClass}
  />
);

export function StepContact({ values, errors, channel, onChannelChange }: StepContactProps) {
  const f = copy.fields;
  const showSafety = channel === undefined || (channel !== null && isPhoneChannel(channel));

  return (
    <div className="grid gap-6">
      <Field name="fullName" label={f.fullName.label} error={errors.fullName}>
        {textInput("fullName", values, errors, {
          type: "text",
          autoComplete: "name",
          required: true,
        })}
      </Field>

      <Field name="email" label={f.email.label} error={errors.email}>
        {textInput("email", values, errors, {
          type: "email",
          autoComplete: "email",
          required: true,
        })}
      </Field>

      <ChoiceGroup
        name="emailIsPrivate"
        legend={f.emailIsPrivate.legend}
        hint={f.emailIsPrivate.hint}
        options={[
          { value: "true", label: f.emailIsPrivate.yes },
          { value: "false", label: f.emailIsPrivate.no },
        ]}
        defaultValue={values.emailIsPrivate}
        error={errors.emailIsPrivate}
      />

      <Field name="phone" label={f.phone.label} hint={f.phone.hint} error={errors.phone}>
        {textInput("phone", values, errors, { type: "tel", autoComplete: "tel", hasHint: true })}
      </Field>

      <ChoiceGroup
        name="preferredChannel"
        legend={f.preferredChannel.legend}
        options={CONTACT_CHANNELS.map((value) => ({ value, label: CONTACT_CHANNEL_LABELS[value] }))}
        defaultValue={values.preferredChannel}
        error={errors.preferredChannel}
        onChange={(value) => onChannelChange(value as ContactChannel)}
      />

      {showSafety ? (
        <ChoiceGroup
          name="safeToContact"
          legend={f.safeToContact.legend}
          hint={f.safeToContact.hint}
          options={[
            { value: "true", label: f.safeToContact.yes },
            { value: "false", label: f.safeToContact.no },
          ]}
          defaultValue={values.safeToContact}
          error={errors.safeToContact}
        />
      ) : null}

      <div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-foreground">
          <input
            id={fieldIds("consent").control}
            type="checkbox"
            name="consent"
            defaultChecked={values.consent === "on"}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={describedBy("consent", false, errors.consent)}
            aria-required="true"
            className="mt-1 size-5 shrink-0 accent-primary"
          />
          <span>
            {f.consent.before}
            {/* New tab: following the link must not lose what was typed (US-03 CA4). */}
            <Link
              href={f.consent.href}
              target="_blank"
              rel="noopener"
              className="font-semibold text-primary underline underline-offset-4"
            >
              {f.consent.link}
              <span className="sr-only"> {f.consent.newTab}</span>
            </Link>
            {f.consent.after}
          </span>
        </label>
        <FieldError name="consent" message={errors.consent} />
      </div>
    </div>
  );
}
