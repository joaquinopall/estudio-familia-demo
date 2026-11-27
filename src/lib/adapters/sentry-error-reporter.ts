/**
 * ErrorReporter for Sentry without its SDK (F5-04, ADR-0018): one `fetch` per error to the
 * envelope endpoint (https://develop.sentry.dev/sdk/foundations/envelopes/).
 *
 * The SDK (@sentry/nextjs) was discarded: a heavy dependency, JavaScript in the browser
 * (Lighthouse), a CSP change, and it sends request data (headers, IP, body) by default. Here
 * only the logger's allowlisted fields leave the server.
 *
 * Event: the message and the fingerprint are the event name (errors group by event), tags
 * are searchable codes and names, extra carries the ids. Never throws (ADR-0013). On a 429 it
 * drops events until the limit expires, as Sentry asks, without retrying.
 */
import "server-only";

import { randomUUID } from "node:crypto";

import type { LogEntry } from "@/lib/logger";
import type { ErrorReportResult, ErrorReporter } from "@/lib/ports/error-reporter";

const TIMEOUT_MS = 3000;
const DEFAULT_RETRY_AFTER_S = 60;
const CLIENT = "estudio-familia-demo/1.0";

export type SentryDsn = { endpoint: string; publicKey: string; dsn: string };

/** https://<public key>@<host>/<project id> → its envelope endpoint and key. */
export function parseSentryDsn(dsn: string): SentryDsn {
  const url = new URL(dsn);
  const projectId = url.pathname.replace(/^\//, "");
  if (url.protocol !== "https:" || !url.username || !/^\d+$/.test(projectId)) {
    throw new Error("SENTRY_DSN inválido.");
  }
  return {
    endpoint: `https://${url.host}/api/${projectId}/envelope/`,
    publicKey: decodeURIComponent(url.username),
    dsn,
  };
}

type Options = {
  dsn: string;
  /** VERCEL_ENV, or "development" outside Vercel. */
  environment: string;
  /** The commit (VERCEL_GIT_COMMIT_SHA), when known. */
  release?: string;
  fetch?: typeof fetch;
  now?: () => Date;
};

/** Only the logger's fields, split into what Sentry indexes (tags) and the ids (extra). */
export function toSentryEvent(entry: LogEntry, options: Pick<Options, "environment" | "release">) {
  const tags: Record<string, string> = { event: entry.event };
  for (const key of ["errorCode", "errorName", "route", "routeType"] as const) {
    const value = entry[key];
    if (value) tags[key] = value;
  }
  const extra: Record<string, string | number> = {};
  for (const key of ["inquiryId", "staffId", "requestId", "digest", "durationMs"] as const) {
    const value = entry[key];
    if (value !== undefined) extra[key] = value;
  }
  return {
    event_id: randomUUID().replaceAll("-", ""),
    timestamp: entry.timestamp,
    platform: "node",
    level: "error",
    logger: "app",
    message: entry.event,
    fingerprint: [entry.event],
    environment: options.environment,
    ...(options.release ? { release: options.release } : {}),
    tags,
    extra,
  };
}

export function createSentryErrorReporter(options: Options): ErrorReporter {
  const target = parseSentryDsn(options.dsn);
  const doFetch = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());
  let mutedUntil = 0;

  return {
    async report(entry: LogEntry): Promise<ErrorReportResult> {
      if (now().getTime() < mutedUntil) return { status: "dropped" };

      const event = toSentryEvent(entry, options);
      const body = [
        JSON.stringify({ event_id: event.event_id, dsn: target.dsn, sent_at: now().toISOString() }),
        JSON.stringify({ type: "event" }),
        JSON.stringify(event),
      ].join("\n");

      try {
        const response = await doFetch(target.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-sentry-envelope",
            "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=${CLIENT}, sentry_key=${target.publicKey}`,
            "User-Agent": CLIENT,
          },
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After"));
          const seconds =
            Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : DEFAULT_RETRY_AFTER_S;
          mutedUntil = now().getTime() + seconds * 1000;
          return { status: "dropped" };
        }
        if (!response.ok) return { status: "unavailable", reason: `http_${response.status}` };
        return { status: "sent" };
      } catch (error) {
        const reason =
          error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network";
        return { status: "unavailable", reason };
      }
    },
  };
}
