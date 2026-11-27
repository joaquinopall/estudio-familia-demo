/**
 * Connects the logger's error sink to the ErrorReporter (F5-04, ADR-0018). Called once per
 * server instance from instrumentation.ts.
 *
 * Every `logger.error(...)` entry is reported in the background. Inside a request it is
 * registered with after(), so Vercel keeps the function alive until it is sent; outside one
 * (a database pool event, a script) after() throws and the report just runs. onRequestError
 * awaits flushErrorReports() before returning, as Next asks.
 */
import "server-only";

import { after } from "next/server";

import { setErrorSink } from "@/lib/logger";
import type { ErrorReporter } from "@/lib/ports/error-reporter";

const pending = new Set<Promise<unknown>>();

/** Starts reporting errors; with no reporter (no SENTRY_DSN) it does nothing. */
export function startErrorReporting(
  reporter: ErrorReporter | null,
  options: { runAfterResponse?: (task: Promise<unknown>) => void } = {},
): void {
  if (!reporter) {
    setErrorSink(undefined);
    return;
  }
  const runAfterResponse = options.runAfterResponse ?? after;

  setErrorSink((entry) => {
    const task: Promise<unknown> = reporter.report(entry).finally(() => pending.delete(task));
    pending.add(task);
    try {
      runAfterResponse(task);
    } catch {
      // Outside a request: nothing to extend, the report goes on by itself.
    }
  });
}

/** Waits for the reports in flight (never rejects: the reporter never throws). */
export async function flushErrorReports(): Promise<void> {
  await Promise.allSettled([...pending]);
}
