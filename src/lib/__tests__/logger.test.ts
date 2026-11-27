import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { LOG_EVENTS } from "@/lib/log-events";
import { createLogger, setErrorSink, type LogContext, type LogLevel } from "@/lib/logger";

const FIXED_DATE = new Date("2026-11-18T12:00:00.000Z");

function setup() {
  const lines: { level: LogLevel; line: string }[] = [];
  const logger = createLogger({
    write: (level, line) => lines.push({ level, line }),
    now: () => FIXED_DATE,
  });
  const parsed = () => lines.map(({ line }) => JSON.parse(line) as Record<string, unknown>);
  return { logger, lines, parsed };
}

describe("logger", () => {
  it("writes one JSON line with level, event and timestamp", () => {
    const { logger, lines, parsed } = setup();

    logger.info("inquiry.created", { inquiryId: "7f3a9b21-0000-4000-8000-000000000000" });

    expect(lines).toHaveLength(1);
    expect(parsed()[0]).toEqual({
      level: "info",
      event: "inquiry.created",
      timestamp: "2026-11-18T12:00:00.000Z",
      inquiryId: "7f3a9b21-0000-4000-8000-000000000000",
    });
  });

  it.each(["info", "warn", "error"] as const)("routes %s to the matching writer level", (level) => {
    const { logger, lines } = setup();

    logger[level]("inquiry.created");

    expect(lines[0]?.level).toBe(level);
  });

  it("drops keys outside the allowlist, even if types are bypassed", () => {
    const { logger, lines, parsed } = setup();
    const context = {
      errorCode: "upstash_timeout",
      email: "persona@example.com",
      fullName: "Persona Ficticia",
    } as unknown as LogContext;

    logger.warn("rate_limit.unavailable", context);

    expect(parsed()[0]).toEqual({
      level: "warn",
      event: "rate_limit.unavailable",
      timestamp: "2026-11-18T12:00:00.000Z",
      errorCode: "upstash_timeout",
    });
    expect(lines[0]?.line).not.toContain("persona@example.com");
  });

  it("logs only the error name, never its message", () => {
    const { logger, lines, parsed } = setup();
    const error = new TypeError("Unique constraint failed for persona@example.com");

    logger.error("inquiry.store_failed", { errorCode: "INTERNAL", error });

    expect(parsed()[0]).toMatchObject({ errorCode: "INTERNAL", errorName: "TypeError" });
    expect(lines[0]?.line).not.toContain("persona@example.com");
  });

  it("describes non-Error values by their type only", () => {
    const { logger, parsed } = setup();

    logger.error("request.error", { error: "texto con datos personales" });

    expect(parsed()[0]).toMatchObject({ errorName: "string" });
  });

  it("keeps numeric durations and ignores non-string ids", () => {
    const { logger, parsed } = setup();
    const context = { durationMs: 42, inquiryId: 123 } as unknown as LogContext;

    logger.info("inquiry.created", context);

    expect(parsed()[0]).toMatchObject({ durationMs: 42 });
    expect(parsed()[0]).not.toHaveProperty("inquiryId");
  });

  it("keeps the digest, the route pattern and the route type (F5-04)", () => {
    const { logger, parsed } = setup();

    logger.error("request.error", {
      digest: "3802741954",
      route: "/admin/consultas/[id]",
      routeType: "render",
    });

    expect(parsed()[0]).toMatchObject({
      digest: "3802741954",
      route: "/admin/consultas/[id]",
      routeType: "render",
    });
  });
});

describe("error sink (F5-04, ADR-0018)", () => {
  afterEach(() => setErrorSink(undefined));

  it("receives every error entry, already filtered, and nothing else", () => {
    const sink = vi.fn();
    setErrorSink(sink);
    const { logger } = setup();
    const context = { inquiryId: "abc", email: "persona@example.com" } as unknown as LogContext;

    logger.info("inquiry.created", context);
    logger.warn("rate_limit.unavailable", context);
    logger.error("inquiry.firm_email_failed", {
      ...context,
      error: new Error("smtp persona@example.com"),
    });

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith({
      level: "error",
      event: "inquiry.firm_email_failed",
      timestamp: "2026-11-18T12:00:00.000Z",
      inquiryId: "abc",
      errorName: "Error",
    });
  });

  it("never breaks the code that logs when the sink throws", () => {
    setErrorSink(() => {
      throw new Error("sentry down");
    });
    const { logger, lines } = setup();

    expect(() => logger.error("request.error")).not.toThrow();
    expect(lines).toHaveLength(1);
  });
});

describe("log event catalog (log-events.ts)", () => {
  /** Every `logger.<level>("<event>"` call in the app source (tests excluded). */
  function loggerCalls(dir: string): { level: string; event: string; file: string }[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return ["__tests__", "generated"].includes(entry.name) ? [] : loggerCalls(path);
      }
      if (!/\.tsx?$/.test(entry.name)) return [];
      const source = readFileSync(path, "utf8");
      return [...source.matchAll(/logger\.(info|warn|error)\(\s*"([^"]+)"/g)].map((m) => ({
        level: m[1] ?? "",
        event: m[2] ?? "",
        file: path,
      }));
    });
  }

  const calls = loggerCalls(join(process.cwd(), "src"));

  it("finds the logger calls (sanity check of the scan)", () => {
    expect(calls.length).toBeGreaterThan(30);
  });

  it("logs every event at the level the catalog says", () => {
    const mismatches = calls
      .filter((call) => LOG_EVENTS[call.event as keyof typeof LOG_EVENTS]?.level !== call.level)
      .map((call) => `${call.event} as ${call.level} in ${call.file}`);

    expect(mismatches).toEqual([]);
  });

  it("has no event that nothing logs, except request.error (instrumentation.ts)", () => {
    const used = new Set(calls.map((call) => call.event));
    const unused = Object.keys(LOG_EVENTS).filter((event) => !used.has(event));

    expect(unused).toEqual([]);
  });

  it("matches the event table of docs/ARCHITECTURE.md (name and level)", () => {
    const architecture = readFileSync(join(process.cwd(), "docs", "ARCHITECTURE.md"), "utf8");
    const documented = Object.fromEntries(
      [...architecture.matchAll(/^\|\s*`([a-z_.]+)`\s*\|\s*(info|warn|error)\s*\|/gm)].map((m) => [
        m[1],
        m[2],
      ]),
    );
    const catalog = Object.fromEntries(
      Object.entries(LOG_EVENTS).map(([event, { level }]) => [event, level]),
    );

    expect(documented).toEqual(catalog);
  });
});
