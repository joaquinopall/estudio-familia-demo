// @vitest-environment node
/**
 * The real submitInquiry action: reads the client IP from the request and wires the real
 * dependencies. Next's request APIs and the external services are mocked; the logic itself
 * is covered by submit-inquiry.test.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: new Headers({ "x-forwarded-for": "203.0.113.7" }),
  after: vi.fn(),
  handler: vi.fn(async () => ({
    ok: true,
    data: { reference: "C-7F3A9B21", doNotContact: false },
  })),
  createHandler: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => mocks.headers }));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/features/inquiries/submit-inquiry", () => ({
  createSubmitInquiryHandler: mocks.createHandler.mockImplementation(() => mocks.handler),
}));

describe("submitInquiry action", () => {
  afterEach(() => vi.clearAllMocks());

  it("passes the form and the client IP to the handler and returns its result", async () => {
    const { submitInquiry } = await import("@/features/inquiries/actions");
    const formData = new FormData();

    const result = await submitInquiry(null, formData);

    expect(result).toEqual({ ok: true, data: { reference: "C-7F3A9B21", doNotContact: false } });
    expect(mocks.handler).toHaveBeenCalledWith({ formData, clientIp: "203.0.113.7" });
  });

  it("wires after() for the emails and the salt from env", async () => {
    const { submitInquiry } = await import("@/features/inquiries/actions");
    await submitInquiry(null, new FormData());

    expect(mocks.createHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        runAfterResponse: mocks.after,
        ipHashSalt: "fake-salt-for-unit-tests-only-0123456789",
      }),
    );
  });
});
