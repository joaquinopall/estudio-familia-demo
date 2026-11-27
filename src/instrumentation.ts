/**
 * Next.js instrumentation (F5-04, NFR-OBS-01, ADR-0018).
 *
 * - register(): once per server instance, connects the logger to Sentry when SENTRY_DSN is set.
 * - onRequestError(): every server error nobody caught (render, Server Action, route, proxy)
 *   becomes a `request.error` log entry, through the logger's allowlist: the error's name,
 *   Next's digest (shown on the error page) and the route PATTERN. Never the message, the URL
 *   or the request headers, which may carry personal data. Next still prints its own line.
 *
 * NEXT_RUNTIME is Next's own variable (not ours): the reporter needs Node (node:crypto).
 */
import type { Instrumentation } from "next";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startErrorReporting } = await import("./lib/error-reporting");
  const { getErrorReporter } = await import("./lib/adapters");
  startErrorReporting(getErrorReporter());
}

/** Next's hash of an error, when it has one. */
function digestOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error) {
    const digest = (error as { digest: unknown }).digest;
    return typeof digest === "string" ? digest : undefined;
  }
  return undefined;
}

export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  const { logger } = await import("./lib/logger");
  logger.error("request.error", {
    error,
    digest: digestOf(error),
    route: context.routePath,
    routeType: context.routeType,
  });
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { flushErrorReports } = await import("./lib/error-reporting");
    await flushErrorReports();
  }
};
