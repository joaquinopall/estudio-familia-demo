/**
 * Every log event of the app (NFR-OBS-01, F5-04). The logger only accepts these names, so a
 * typo does not compile and this list is the catalog: what can show up in the logs, at which
 * level and when. docs/ARCHITECTURE.md ("Eventos de log") mirrors it; a test keeps them equal.
 *
 * Every `error` event is also sent to the error reporter (Sentry) when SENTRY_DSN is set
 * (ADR-0018). Fields are always the logger's allowlist: ids, codes, names, never personal data.
 */
export type LogLevel = "info" | "warn" | "error";

export const LOG_EVENTS = {
  // Inquiries: the public form (F3-05).
  "inquiry.created": { level: "info", when: "A new inquiry was stored." },
  "inquiry.honeypot": {
    level: "info",
    when: "The honeypot was filled: fake success, nothing stored.",
  },
  "inquiry.rate_limited": { level: "info", when: "Too many inquiries from the same IP or email." },
  "inquiry.store_failed": { level: "error", when: "The inquiry could not be stored (database)." },
  "inquiry.emails_failed": { level: "error", when: "Sending the emails of a new inquiry threw." },
  "inquiry.firm_email_failed": {
    level: "error",
    when: "The firm was not notified of a new inquiry.",
  },
  "inquiry.receipt_email_failed": {
    level: "error",
    when: "The receipt to the person was not sent.",
  },
  "captcha.invalid": { level: "warn", when: "Turnstile rejected the token." },
  "captcha.unavailable": {
    level: "error",
    when: "Turnstile did not answer: the inquiry is rejected.",
  },
  "rate_limit.unavailable": {
    level: "warn",
    when: "Upstash did not answer: the request goes through.",
  },
  "rate_limit.no_client_ip": { level: "warn", when: "No client IP: the per-IP rule is skipped." },

  // Panel (F4).
  "inquiry.list_failed": { level: "error", when: "The panel list could not be loaded." },
  "inquiry.detail_failed": {
    level: "error",
    when: "An inquiry could not be read (decrypt_failed included).",
  },
  "inquiry.status_changed": { level: "info", when: "Staff changed the status of an inquiry." },
  "inquiry.status_change_failed": { level: "error", when: "A status change could not be saved." },
  "inquiry.notes_updated": { level: "info", when: "Staff saved the internal notes." },
  "inquiry.notes_update_failed": { level: "error", when: "The internal notes could not be saved." },

  // Auth (F4-01, F4-02).
  "auth.signed_in": { level: "info", when: "A staff member signed in." },
  "auth.signed_out": { level: "info", when: "A staff member signed out." },
  "auth.sign_in_rejected": { level: "info", when: "Wrong credentials (the provider's code only)." },
  "auth.sign_in_rate_limited": { level: "info", when: "Too many login attempts from the same IP." },
  "auth.sign_in_rate_limited_by_provider": { level: "warn", when: "Supabase's own login limit." },
  "auth.sign_in_unavailable": { level: "error", when: "Supabase Auth did not answer the login." },
  "auth.sign_out_failed": { level: "error", when: "Supabase Auth failed to sign out." },
  "auth.forbidden": { level: "warn", when: "A session without active staff tried the panel." },
  "auth.session_check_failed": { level: "warn", when: "The proxy could not verify a session." },
  "auth.user_check_unavailable": {
    level: "error",
    when: "Supabase Auth did not verify a session.",
  },
  "auth.staff_lookup_failed": { level: "error", when: "The staff member could not be read." },

  // Infrastructure.
  "error_reporting.started": {
    level: "info",
    when: "A server instance started; enabled says whether errors go to Sentry.",
  },
  "error_report.failed": {
    level: "warn",
    when: "Sentry rejected or did not receive an error report (errorCode: the reason).",
  },
  "db.pool_error": { level: "error", when: "An idle database connection failed." },
  "request.error": { level: "error", when: "An error nobody caught (instrumentation.ts)." },
} as const satisfies Record<string, { level: LogLevel; when: string }>;

export type LogEvent = keyof typeof LOG_EVENTS;
