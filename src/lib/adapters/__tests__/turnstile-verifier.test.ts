// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import {
  MAX_TOKEN_LENGTH,
  SITEVERIFY_URL,
  TURNSTILE_TEST_HOSTNAME,
  TurnstileVerifier,
  expectedTurnstileHostname,
} from "@/lib/adapters/turnstile-verifier";

const SECRET = "0x4AAAAAAA-real-secret";
const HOSTNAME = "estudio.example.com";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function verifierWith(fetchImpl: typeof fetch, timeoutMs?: number) {
  const fetchMock = vi.fn(fetchImpl);
  const verifier = new TurnstileVerifier({
    secretKey: SECRET,
    expectedHostname: HOSTNAME,
    fetch: fetchMock,
    ...(timeoutMs ? { timeoutMs } : {}),
  });
  return { verifier, fetchMock };
}

const success = { success: true, "error-codes": [], hostname: HOSTNAME };

describe("TurnstileVerifier (server-side siteverify)", () => {
  it("posts secret, token and IP to siteverify and accepts a valid token", async () => {
    const { verifier, fetchMock } = verifierWith(async () => jsonResponse(success));

    expect(await verifier.verify({ token: " token-123 ", remoteIp: "203.0.113.7" })).toEqual({
      status: "ok",
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(SITEVERIFY_URL);
    expect(init?.method).toBe("POST");
    const body = init?.body as URLSearchParams;
    expect(body.get("secret")).toBe(SECRET);
    expect(body.get("response")).toBe("token-123");
    expect(body.get("remoteip")).toBe("203.0.113.7");
  });

  it("omits remoteip when the IP is unknown", async () => {
    const { verifier, fetchMock } = verifierWith(async () => jsonResponse(success));
    await verifier.verify({ token: "t" });

    expect((fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams).has("remoteip")).toBe(false);
  });

  it("rejects a token issued for another hostname", async () => {
    const { verifier } = verifierWith(async () =>
      jsonResponse({ ...success, hostname: "evil.example.net" }),
    );

    expect(await verifier.verify({ token: "t" })).toEqual({
      status: "invalid",
      errorCodes: ["hostname-mismatch"],
    });
  });

  it.each(["invalid-input-response", "timeout-or-duplicate", "missing-input-response"])(
    "reports %s as an invalid token",
    async (code) => {
      const { verifier } = verifierWith(async () =>
        jsonResponse({ success: false, "error-codes": [code] }),
      );
      expect(await verifier.verify({ token: "t" })).toEqual({
        status: "invalid",
        errorCodes: [code],
      });
    },
  );

  it.each(["internal-error", "invalid-input-secret", "missing-input-secret", "bad-request"])(
    "reports %s as unavailable (not the visitor's fault)",
    async (code) => {
      const { verifier } = verifierWith(async () =>
        jsonResponse({ success: false, "error-codes": [code] }),
      );
      expect(await verifier.verify({ token: "t" })).toEqual({
        status: "unavailable",
        errorCodes: [code],
      });
    },
  );

  it.each([
    ["an empty token", ""],
    ["a blank token", "   "],
  ])("rejects %s without calling Cloudflare", async (_label, token) => {
    const { verifier, fetchMock } = verifierWith(async () => jsonResponse(success));

    expect(await verifier.verify({ token })).toEqual({
      status: "invalid",
      errorCodes: ["missing-input-response"],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a token longer than 2048 characters without calling Cloudflare", async () => {
    const { verifier, fetchMock } = verifierWith(async () => jsonResponse(success));

    expect(await verifier.verify({ token: "a".repeat(MAX_TOKEN_LENGTH + 1) })).toEqual({
      status: "invalid",
      errorCodes: ["token-too-long"],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is unavailable when siteverify answers with an HTTP error", async () => {
    const { verifier } = verifierWith(async () => new Response("oops", { status: 503 }));
    expect(await verifier.verify({ token: "t" })).toEqual({
      status: "unavailable",
      errorCodes: ["http-503"],
    });
  });

  it("is unavailable when the response is not the expected JSON", async () => {
    const { verifier } = verifierWith(async () => jsonResponse({ unexpected: true }));
    expect(await verifier.verify({ token: "t" })).toEqual({
      status: "unavailable",
      errorCodes: ["invalid-response"],
    });
  });

  it("never throws: a network failure is unavailable", async () => {
    const { verifier } = verifierWith(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await verifier.verify({ token: "t" })).toEqual({
      status: "unavailable",
      errorCodes: ["network-error"],
    });
  });

  it("gives up after the timeout instead of keeping the person waiting", async () => {
    const { verifier } = verifierWith(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
      50,
    );

    expect(await verifier.verify({ token: "t" })).toEqual({
      status: "unavailable",
      errorCodes: ["timeout"],
    });
  });
});

describe("expectedTurnstileHostname", () => {
  it("uses the site's hostname with real keys", () => {
    expect(expectedTurnstileHostname(SECRET, "https://estudio.example.com")).toBe(
      "estudio.example.com",
    );
  });

  it.each([
    "1x0000000000000000000000000000000AA",
    "2x0000000000000000000000000000000AA",
    "3x0000000000000000000000000000000AA",
  ])("uses example.com with the test secret %s (Cloudflare's test answer)", (secret) => {
    expect(expectedTurnstileHostname(secret, "http://localhost:3000")).toBe(
      TURNSTILE_TEST_HOSTNAME,
    );
  });
});
