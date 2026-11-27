// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import {
  createSentryErrorReporter,
  parseSentryDsn,
  toSentryEvent,
} from "@/lib/adapters/sentry-error-reporter";
import type { LogEntry } from "@/lib/logger";

const DSN = "https://abc123publickey@o4507.ingest.us.sentry.io/4508";
const NOW = new Date("2026-11-27T15:00:00.000Z");

const entry: LogEntry = {
  level: "error",
  event: "inquiry.firm_email_failed",
  timestamp: "2026-11-27T15:00:00.000Z",
  inquiryId: "7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b",
  errorCode: "network_error",
  errorName: "Error",
};

function setup(response: Response | Error = new Response('{"id":"x"}', { status: 200 })) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response.clone();
  });
  let now = NOW;
  const reporter = createSentryErrorReporter({
    dsn: DSN,
    environment: "preview",
    release: "1234567",
    fetch: fetchMock as unknown as typeof fetch,
    now: () => now,
  });
  return { reporter, fetchMock, advance: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

/** The three lines of the envelope sent in the first call. */
function sentEnvelope(fetchMock: ReturnType<typeof setup>["fetchMock"]) {
  const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return (init.body as string)
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("parseSentryDsn", () => {
  it("derives the envelope endpoint and the public key", () => {
    expect(parseSentryDsn(DSN)).toEqual({
      endpoint: "https://o4507.ingest.us.sentry.io/api/4508/envelope/",
      publicKey: "abc123publickey",
      dsn: DSN,
    });
  });

  it.each(["http://key@sentry.io/1", "https://sentry.io/1", "https://key@sentry.io/abc"])(
    "rejects %s",
    (dsn) => {
      expect(() => parseSentryDsn(dsn)).toThrow("SENTRY_DSN inválido.");
    },
  );
});

describe("createSentryErrorReporter (ADR-0018)", () => {
  it("posts one envelope to the project's endpoint with the auth header", async () => {
    const { reporter, fetchMock } = setup();

    expect(await reporter.report(entry)).toEqual({ status: "sent" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://o4507.ingest.us.sentry.io/api/4508/envelope/");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/x-sentry-envelope",
      "X-Sentry-Auth": expect.stringMatching(
        /^Sentry sentry_version=7, sentry_client=[^,]+, sentry_key=abc123publickey$/,
      ),
    });
  });

  it("builds the envelope: header, item header and the event, with matching ids", async () => {
    const { reporter, fetchMock } = setup();
    await reporter.report(entry);

    const [header, item, event] = sentEnvelope(fetchMock);
    expect(header).toEqual({ event_id: event?.event_id, dsn: DSN, sent_at: NOW.toISOString() });
    expect(item).toEqual({ type: "event" });
    expect(event?.event_id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("sends only the logger's fields: the event as message and grouping, codes as tags, ids as extra", async () => {
    const { reporter, fetchMock } = setup();
    await reporter.report({
      ...entry,
      digest: "3802741954",
      route: "/contacto",
      routeType: "action",
    });

    const [, , event] = sentEnvelope(fetchMock);
    expect(event).toEqual({
      event_id: expect.any(String),
      timestamp: entry.timestamp,
      platform: "node",
      level: "error",
      logger: "app",
      message: "inquiry.firm_email_failed",
      fingerprint: ["inquiry.firm_email_failed"],
      environment: "preview",
      release: "1234567",
      tags: {
        event: "inquiry.firm_email_failed",
        errorCode: "network_error",
        errorName: "Error",
        route: "/contacto",
        routeType: "action",
      },
      extra: { inquiryId: entry.inquiryId, digest: "3802741954" },
    });
  });

  it("never sends fields outside the logger's allowlist, even if they slip in", () => {
    const leaky = { ...entry, email: "persona@example.com", message: "texto" } as LogEntry;
    const event = toSentryEvent(leaky, { environment: "production" });

    expect(JSON.stringify(event)).not.toContain("persona@example.com");
    expect(JSON.stringify(event)).not.toContain("texto");
  });

  it("drops events while Sentry's rate limit lasts, without retrying", async () => {
    const { reporter, fetchMock, advance } = setup(
      new Response("", { status: 429, headers: { "Retry-After": "30" } }),
    );

    expect(await reporter.report(entry)).toEqual({ status: "dropped" });
    advance(29_000);
    expect(await reporter.report(entry)).toEqual({ status: "dropped" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    advance(2_000);
    await reporter.report(entry);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("assumes 60 seconds when a 429 has no Retry-After", async () => {
    const { reporter, fetchMock, advance } = setup(new Response("", { status: 429 }));

    await reporter.report(entry);
    advance(59_000);
    await reporter.report(entry);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["an HTTP error", new Response("", { status: 500 }), "http_500"],
    ["a network failure", new TypeError("fetch failed"), "network"],
    ["a timeout", Object.assign(new Error("aborted"), { name: "TimeoutError" }), "timeout"],
  ])("never throws on %s: it is unavailable", async (_name, response, reason) => {
    const { reporter } = setup(response);

    await expect(reporter.report(entry)).resolves.toEqual({ status: "unavailable", reason });
  });
});
