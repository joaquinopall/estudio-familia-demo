"use client";

/**
 * Staff login form (US-06 CA1, SPEC §6.5, NFR-A11Y-01). Native controls and a Server Action:
 * it works without JavaScript. Errors come from the server only (two fields; no need to ship a
 * schema to the browser):
 * - the general message (wrong credentials, too many attempts...) goes in role="alert" and
 *   takes the focus;
 * - shape errors go next to their field, linked with aria-describedby.
 * After a failure the email is restored from the action's result; the password never is.
 */
import { useActionState, useEffect, useRef } from "react";

import { controlClass, focusOutlineClass } from "@/components/forms/field-styles";
import { Button } from "@/components/ui/button";
import { adminPanelContent } from "@/content/admin-panel";

import { signIn } from "../actions";
import { LOGIN_FORM_ID } from "./login-ids";

const copy = adminPanelContent.login;

const ids = {
  email: "login-email",
  password: "login-password",
  emailError: "login-email-error",
  passwordError: "login-password-error",
} as const;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null);
  const alertRef = useRef<HTMLDivElement>(null);

  const emailError = state?.error.fieldErrors?.email?.[0];
  const passwordError = state?.error.fieldErrors?.password?.[0];

  // Every new failure moves the focus to the message, so it is read and the person can go on.
  useEffect(() => {
    if (state) alertRef.current?.focus();
  }, [state]);

  return (
    // The id lets the page's `next` hidden field (outside this form) join it (F4-06).
    <form id={LOGIN_FORM_ID} action={formAction} noValidate className="grid gap-5">
      {state ? (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-lg border-l-4 border-destructive bg-secondary p-4 font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {state.error.message}
        </div>
      ) : null}

      <div>
        <label htmlFor={ids.email} className="mb-2 block font-medium text-foreground">
          {copy.email}
        </label>
        <input
          id={ids.email}
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          spellCheck={false}
          defaultValue={state?.values?.email ?? ""}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? ids.emailError : undefined}
          className={controlClass}
        />
        <FieldError id={ids.emailError} message={emailError} />
      </div>

      <div>
        <label htmlFor={ids.password} className="mb-2 block font-medium text-foreground">
          {copy.password}
        </label>
        <input
          id={ids.password}
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? ids.passwordError : undefined}
          className={controlClass}
        />
        <FieldError id={ids.passwordError} message={passwordError} />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className={`min-h-11 w-full px-6 text-base ${focusOutlineClass}`}
      >
        {pending ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
