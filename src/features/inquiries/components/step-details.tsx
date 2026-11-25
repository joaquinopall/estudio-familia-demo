/** Step 1 of the inquiry form: area, urgency and message (US-03 CA1). */
import { inquiryFormContent as copy } from "@/content/inquiry-form";

import type { InquiryFormValues } from "../form-values";
import { PRACTICE_AREA_LABELS, URGENCY_LABELS } from "../labels";
import { MESSAGE_MAX_LENGTH } from "../schema";
import { PRACTICE_AREAS, URGENCIES } from "../types";
import { ChoiceGroup, Field, controlClass, describedBy, fieldIds } from "./form-field";
import type { FieldErrorMap } from "./form-validation";

type StepDetailsProps = {
  values: InquiryFormValues;
  errors: FieldErrorMap;
};

export function StepDetails({ values, errors }: StepDetailsProps) {
  const { area, urgency, message } = copy.fields;

  return (
    <div className="grid gap-6">
      <Field name="area" label={area.label} error={errors.area}>
        <select
          id={fieldIds("area").control}
          name="area"
          defaultValue={values.area ?? ""}
          aria-invalid={errors.area ? true : undefined}
          aria-describedby={describedBy("area", false, errors.area)}
          aria-required="true"
          className={controlClass}
        >
          <option value="" disabled>
            {area.placeholder}
          </option>
          {PRACTICE_AREAS.map((code) => (
            <option key={code} value={code}>
              {PRACTICE_AREA_LABELS[code]}
            </option>
          ))}
        </select>
      </Field>

      <ChoiceGroup
        name="urgency"
        legend={urgency.legend}
        options={URGENCIES.map((value) => ({ value, label: URGENCY_LABELS[value] }))}
        defaultValue={values.urgency}
        error={errors.urgency}
      />

      <Field name="message" label={message.label} hint={message.hint} error={errors.message}>
        <textarea
          id={fieldIds("message").control}
          name="message"
          rows={6}
          maxLength={MESSAGE_MAX_LENGTH}
          defaultValue={values.message ?? ""}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={describedBy("message", true, errors.message)}
          aria-required="true"
          className={controlClass}
        />
      </Field>
    </div>
  );
}
