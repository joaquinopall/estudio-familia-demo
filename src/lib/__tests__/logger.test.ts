import { describe, expect, it } from "vitest";

import { createLogger, type LogContext, type LogLevel } from "@/lib/logger";

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

    logger[level]("some.event");

    expect(lines[0]?.level).toBe(level);
  });

  it("drops keys outside the allowlist, even if types are bypassed", () => {
    const { logger, lines, parsed } = setup();
    const context = {
      errorCode: "EMAIL_SEND_FAILED",
      email: "persona@example.com",
      fullName: "Persona Ficticia",
    } as unknown as LogContext;

    logger.warn("email.failed", context);

    expect(parsed()[0]).toEqual({
      level: "warn",
      event: "email.failed",
      timestamp: "2026-11-18T12:00:00.000Z",
      errorCode: "EMAIL_SEND_FAILED",
    });
    expect(lines[0]?.line).not.toContain("persona@example.com");
  });

  it("logs only the error name, never its message", () => {
    const { logger, lines, parsed } = setup();
    const error = new TypeError("Unique constraint failed for persona@example.com");

    logger.error("inquiry.create_failed", { errorCode: "INTERNAL", error });

    expect(parsed()[0]).toMatchObject({ errorCode: "INTERNAL", errorName: "TypeError" });
    expect(lines[0]?.line).not.toContain("persona@example.com");
  });

  it("describes non-Error values by their type only", () => {
    const { logger, parsed } = setup();

    logger.error("unexpected", { error: "texto con datos personales" });

    expect(parsed()[0]).toMatchObject({ errorName: "string" });
  });

  it("keeps numeric durations and ignores non-string ids", () => {
    const { logger, parsed } = setup();
    const context = { durationMs: 42, inquiryId: 123 } as unknown as LogContext;

    logger.info("timing", context);

    expect(parsed()[0]).toMatchObject({ durationMs: 42 });
    expect(parsed()[0]).not.toHaveProperty("inquiryId");
  });
});
