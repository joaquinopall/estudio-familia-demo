/**
 * Structured JSON logger (NFR-OBS-01) that never logs personal data (NFR-SEC-06).
 *
 * Only allowlisted context fields are written: IDs, error codes, route patterns and timings.
 * Any other key is dropped at runtime even if a caller bypasses the types. For errors, only
 * `error.name` is logged, because messages (e.g. from the database) may contain emails or
 * other PII. Events come from the catalog in log-events.ts.
 *
 * Error sink (F5-04, ADR-0018): every `error` entry, already filtered, is also handed to the
 * sink registered with setErrorSink() (instrumentation.ts: Sentry, when SENTRY_DSN is set).
 * The sink lives on globalThis because Next may load this module more than once in the same
 * process (instrumentation and each route bundle), and they must all share it.
 */
import type { LogEvent, LogLevel } from "./log-events";

export type { LogEvent, LogLevel } from "./log-events";

export type LogContext = {
  inquiryId?: string;
  staffId?: string;
  requestId?: string;
  errorCode?: string;
  /** Next's hash of an error, shown on the error page: correlates a report with the log. */
  digest?: string;
  /** Route pattern, e.g. /admin/consultas/[id]: never the real path (it may carry ids). */
  route?: string;
  /** "render", "action", "route" or "proxy" (Next's routeType). */
  routeType?: string;
  /** Whether a feature is on (error_reporting.started). */
  enabled?: boolean;
  durationMs?: number;
  error?: unknown;
};

export type LogEntry = {
  level: LogLevel;
  event: LogEvent;
  timestamp: string;
  inquiryId?: string;
  staffId?: string;
  requestId?: string;
  errorCode?: string;
  digest?: string;
  route?: string;
  routeType?: string;
  enabled?: boolean;
  durationMs?: number;
  errorName?: string;
};

export type LogWriter = (level: LogLevel, line: string) => void;

export type Logger = Record<LogLevel, (event: LogEvent, context?: LogContext) => void>;

/** Receives every `error` entry after filtering. Must not throw (errors are swallowed). */
export type ErrorSink = (entry: LogEntry) => void;

const STRING_FIELDS = [
  "inquiryId",
  "staffId",
  "requestId",
  "errorCode",
  "digest",
  "route",
  "routeType",
] as const;

const defaultWriter: LogWriter = (level, line) => {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
};

function errorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  return typeof error;
}

export function buildEntry(
  level: LogLevel,
  event: LogEvent,
  context: LogContext | undefined,
  now: Date,
): LogEntry {
  const entry: LogEntry = { level, event, timestamp: now.toISOString() };
  if (!context) return entry;

  for (const field of STRING_FIELDS) {
    const value: unknown = context[field];
    if (typeof value === "string") entry[field] = value;
  }
  if (typeof context.durationMs === "number") entry.durationMs = context.durationMs;
  if (typeof context.enabled === "boolean") entry.enabled = context.enabled;
  if (context.error !== undefined) entry.errorName = errorName(context.error);

  return entry;
}

const SINK_KEY = Symbol.for("estudio-familia.logger.errorSink");
type SinkHolder = { [SINK_KEY]?: ErrorSink };

/** Registers (or clears, with undefined) the process-wide error sink. */
export function setErrorSink(sink: ErrorSink | undefined): void {
  (globalThis as SinkHolder)[SINK_KEY] = sink;
}

function sendToSink(entry: LogEntry): void {
  const sink = (globalThis as SinkHolder)[SINK_KEY];
  if (!sink) return;
  try {
    sink(entry);
  } catch {
    // Reporting must never break the code that logs.
  }
}

export function createLogger(options: { write?: LogWriter; now?: () => Date } = {}): Logger {
  const write = options.write ?? defaultWriter;
  const now = options.now ?? (() => new Date());

  const log = (level: LogLevel) => (event: LogEvent, context?: LogContext) => {
    const entry = buildEntry(level, event, context, now());
    write(level, JSON.stringify(entry));
    if (level === "error") sendToSink(entry);
  };

  return { info: log("info"), warn: log("warn"), error: log("error") };
}

export const logger = createLogger();
