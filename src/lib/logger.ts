/**
 * Structured JSON logger (NFR-OBS-01) that never logs personal data (NFR-SEC-06).
 *
 * Only allowlisted context fields are written: IDs, error codes and timings. Any other key
 * is dropped at runtime even if a caller bypasses the types. For errors, only `error.name`
 * is logged, because messages (e.g. from the database) may contain emails or other PII.
 */

export type LogLevel = "info" | "warn" | "error";

export type LogContext = {
  inquiryId?: string;
  staffId?: string;
  requestId?: string;
  errorCode?: string;
  durationMs?: number;
  error?: unknown;
};

export type LogEntry = {
  level: LogLevel;
  event: string;
  timestamp: string;
  inquiryId?: string;
  staffId?: string;
  requestId?: string;
  errorCode?: string;
  durationMs?: number;
  errorName?: string;
};

export type LogWriter = (level: LogLevel, line: string) => void;

export type Logger = Record<LogLevel, (event: string, context?: LogContext) => void>;

const STRING_FIELDS = ["inquiryId", "staffId", "requestId", "errorCode"] as const;

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
  event: string,
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
  if (context.error !== undefined) entry.errorName = errorName(context.error);

  return entry;
}

export function createLogger(options: { write?: LogWriter; now?: () => Date } = {}): Logger {
  const write = options.write ?? defaultWriter;
  const now = options.now ?? (() => new Date());

  const log = (level: LogLevel) => (event: string, context?: LogContext) => {
    write(level, JSON.stringify(buildEntry(level, event, context, now())));
  };

  return { info: log("info"), warn: log("warn"), error: log("error") };
}

export const logger = createLogger();
