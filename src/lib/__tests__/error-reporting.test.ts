// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ after: vi.fn() }));

import { flushErrorReports, startErrorReporting } from "@/lib/error-reporting";
import { createLogger, setErrorSink } from "@/lib/logger";
import type { ErrorReporter } from "@/lib/ports/error-reporter";
import { FakeErrorReporter } from "@/lib/ports/fakes";

const quietLogger = () => createLogger({ write: () => {} });

const events = (reporter: FakeErrorReporter) => reporter.reported.map((entry) => entry.event);

describe("startErrorReporting (F5-04, ADR-0018)", () => {
  afterEach(() => setErrorSink(undefined));

  it("reports logger errors, and only errors", async () => {
    const reporter = new FakeErrorReporter();
    startErrorReporting(reporter, {
      logger: quietLogger(),
      runAfterResponse: () => {},
    });
    const logger = quietLogger();

    logger.info("inquiry.created");
    logger.warn("captcha.invalid");
    logger.error("inquiry.firm_email_failed", { inquiryId: "abc" });
    await flushErrorReports();

    expect(events(reporter)).toEqual(["inquiry.firm_email_failed"]);
  });

  it("hands each report to after(), so the function lives until it is sent", () => {
    const reporter = new FakeErrorReporter();
    const runAfterResponse = vi.fn();
    startErrorReporting(reporter, {
      logger: quietLogger(),
      runAfterResponse,
    });

    quietLogger().error("request.error");

    expect(runAfterResponse).toHaveBeenCalledWith(expect.any(Promise));
  });

  it("still reports outside a request, where after() throws", async () => {
    const reporter = new FakeErrorReporter();
    startErrorReporting(reporter, {
      logger: quietLogger(),
      runAfterResponse: () => {
        throw new Error("`after` was called outside a request scope");
      },
    });

    expect(() => quietLogger().error("db.pool_error")).not.toThrow();
    await flushErrorReports();
    expect(events(reporter)).toEqual(["db.pool_error"]);
  });

  it("flushErrorReports waits for the reports in flight", async () => {
    let release = () => {};
    const reporter: ErrorReporter = {
      report: () =>
        new Promise((resolve) => {
          release = () => resolve({ status: "sent" });
        }),
    };
    startErrorReporting(reporter, {
      logger: quietLogger(),
      runAfterResponse: () => {},
    });
    quietLogger().error("request.error");

    let flushed = false;
    const flushing = flushErrorReports().then(() => (flushed = true));
    await Promise.resolve();
    expect(flushed).toBe(false);

    release();
    await flushing;
    expect(flushed).toBe(true);
  });

  it("does nothing without a reporter (no SENTRY_DSN)", async () => {
    const reporter = new FakeErrorReporter();
    startErrorReporting(reporter, {
      logger: quietLogger(),
      runAfterResponse: () => {},
    });
    startErrorReporting(null, { logger: quietLogger() });

    quietLogger().error("request.error");
    await flushErrorReports();

    expect(events(reporter)).toEqual([]);
  });

  it("logs on start whether reporting is on, never the DSN", () => {
    const lines: string[] = [];
    const logger = createLogger({ write: (_level, line) => lines.push(line) });

    startErrorReporting(new FakeErrorReporter(), { logger, runAfterResponse: () => {} });
    startErrorReporting(null, { logger });

    expect(lines.map((line) => JSON.parse(line) as Record<string, unknown>)).toEqual([
      expect.objectContaining({ level: "info", event: "error_reporting.started", enabled: true }),
      expect.objectContaining({ level: "info", event: "error_reporting.started", enabled: false }),
    ]);
  });

  it.each([
    [{ status: "unavailable", reason: "http_403" } as const, "http_403"],
    [{ status: "unavailable", reason: "timeout" } as const, "timeout"],
    [{ status: "dropped" } as const, "rate_limited"],
  ])(
    "warns error_report.failed with the reason when a report does not get through",
    async (result, errorCode) => {
      const lines: { level: string; line: string }[] = [];
      const logger = createLogger({ write: (level, line) => lines.push({ level, line }) });
      const reporter: ErrorReporter = { report: async () => result };
      startErrorReporting(reporter, { logger, runAfterResponse: () => {} });

      logger.error("request.error");
      await flushErrorReports();

      const warnings = lines
        .filter(({ level }) => level === "warn")
        .map(({ line }) => JSON.parse(line));
      expect(warnings).toEqual([
        expect.objectContaining({ event: "error_report.failed", errorCode }),
      ]);
    },
  );

  it("logs nothing more when the report is sent", async () => {
    const lines: string[] = [];
    const logger = createLogger({ write: (_level, line) => lines.push(line) });
    startErrorReporting(new FakeErrorReporter(), { logger, runAfterResponse: () => {} });

    logger.error("request.error");
    await flushErrorReports();

    expect(lines.map((line) => (JSON.parse(line) as { event: string }).event)).toEqual([
      "error_reporting.started",
      "request.error",
    ]);
  });
});
