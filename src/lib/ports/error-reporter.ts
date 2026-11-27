/**
 * Port for reporting server errors to an external service (F5-04, ADR-0018). Adapter:
 * lib/adapters/sentry-error-reporter.ts; fake: ports/fakes (FakeErrorReporter).
 *
 * It receives the logger's entry, already filtered by its allowlist (ids, codes, names, route
 * patterns): never a message, a stack or personal data. Like the other ports (ADR-0013),
 * report() never throws: a reporter that is down must not break anything.
 */
import type { LogEntry } from "@/lib/logger";

export type ErrorReportResult =
  | { status: "sent" }
  /** Rate limited by the provider, or still inside a previous limit: dropped, not retried. */
  | { status: "dropped" }
  | { status: "unavailable"; reason: string };

export interface ErrorReporter {
  report(entry: LogEntry): Promise<ErrorReportResult>;
}
