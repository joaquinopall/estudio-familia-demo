/**
 * Building blocks of the inquiry form fields (US-03 CA2, NFR-A11Y-01). Native controls on
 * purpose: they work without JavaScript and submit with the form (FR-04).
 *
 * Each field has a visible label, an optional hint and its error next to it, wired with
 * aria-describedby and aria-invalid so screen readers announce them with the field.
 */
import type { ReactNode } from "react";

/** Stable ids for a field: the control, its hint and its error (the error summary links here). */
export const fieldIds = (name: string) => ({
  control: `inquiry-${name}`,
  hint: `inquiry-${name}-hint`,
  error: `inquiry-${name}-error`,
});

export function describedBy(name: string, hasHint: boolean, error?: string): string | undefined {
  const ids = fieldIds(name);
  const parts = [hasHint ? ids.hint : null, error ? ids.error : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/**
 * The site's focus outline (globals.css :focus-visible, 3:1 contrast). shadcn's Button sets
 * outline-none and a translucent ring that does not reach 3:1, so buttons get this back.
 * outline-solid is needed: in Tailwind 4, outline-none sets --tw-outline-style: none, which
 * outline-2 would otherwise reuse.
 */
export const focusOutlineClass =
  "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** No outline-none here: the global :focus-visible outline must show (NFR-A11Y-01). */
export const controlClass =
  "block min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

export function FieldHint({ name, children }: { name: string; children: ReactNode }) {
  return (
    <p id={fieldIds(name).hint} className="mt-1 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function FieldError({ name, message }: { name: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={fieldIds(name).error} className="mt-2 text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

type FieldProps = {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

/** Label, control (as children), hint and error, stacked. */
export function Field({ name, label, hint, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={fieldIds(name).control} className="mb-2 block font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint ? <FieldHint name={name}>{hint}</FieldHint> : null}
      <FieldError name={name} message={error} />
    </div>
  );
}

export type ChoiceOption = { value: string; label: string };

type ChoiceGroupProps = {
  name: string;
  legend: string;
  options: readonly ChoiceOption[];
  defaultValue?: string;
  hint?: string;
  error?: string;
  onChange?: (value: string) => void;
};

/**
 * A question with native radio buttons inside a fieldset. No option is checked unless the
 * person chose it (US-03 CA6, CA7: no default answer).
 */
export function ChoiceGroup({
  name,
  legend,
  options,
  defaultValue,
  hint,
  error,
  onChange,
}: ChoiceGroupProps) {
  const ids = fieldIds(name);
  return (
    <fieldset
      aria-describedby={describedBy(name, Boolean(hint), error)}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-2 font-medium text-foreground">{legend}</legend>
      {hint ? <FieldHint name={name}>{hint}</FieldHint> : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option, index) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-input bg-background px-3 py-2 text-foreground has-checked:border-primary has-checked:bg-secondary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              // The error summary links to the first option of the group.
              id={index === 0 ? ids.control : undefined}
              defaultChecked={defaultValue === option.value}
              onChange={() => onChange?.(option.value)}
              className="size-5 shrink-0 accent-primary"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <FieldError name={name} message={error} />
    </fieldset>
  );
}
