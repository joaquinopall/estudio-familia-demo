// @vitest-environment node
/**
 * The real panel actions: they authorize with requireStaffForAction (NFR-SEC-02) and refresh
 * the page with next/cache refresh(). The logic is covered by update-inquiry.test.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  requireStaffForAction: vi.fn(),
  inquiryService: { changeStatus: vi.fn(), updateNotes: vi.fn() },
  updateStatus: vi.fn(async () => ({ ok: true, data: { status: "CLOSED", changed: true } })),
  updateNotes: vi.fn(async () => ({ ok: true, data: { updatedAt: new Date(0), changed: true } })),
  createHandlers: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/features/auth/dal", () => ({ requireStaffForAction: mocks.requireStaffForAction }));
vi.mock("@/features/inquiries/server", () => ({ getInquiryService: () => mocks.inquiryService }));
vi.mock("@/features/inquiries/update-inquiry", () => ({
  createUpdateInquiryHandlers: mocks.createHandlers.mockImplementation(() => ({
    updateStatus: mocks.updateStatus,
    updateNotes: mocks.updateNotes,
  })),
}));

describe("panel actions", () => {
  afterEach(() => vi.clearAllMocks());

  it("updateInquiryStatus wires the session check, the service and refresh()", async () => {
    const { updateInquiryStatus } = await import("@/features/inquiries/actions");
    const formData = new FormData();

    const result = await updateInquiryStatus(null, formData);

    expect(result).toEqual({ ok: true, data: { status: "CLOSED", changed: true } });
    expect(mocks.updateStatus).toHaveBeenCalledWith(formData);
    expect(mocks.createHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        authorize: mocks.requireStaffForAction,
        inquiryService: mocks.inquiryService,
        onChanged: mocks.refresh,
      }),
    );
  });

  it("updateInquiryNotes goes through the same wiring", async () => {
    const { updateInquiryNotes } = await import("@/features/inquiries/actions");
    const formData = new FormData();

    await updateInquiryNotes(null, formData);

    expect(mocks.updateNotes).toHaveBeenCalledWith(formData);
    expect(mocks.createHandlers).toHaveBeenCalledWith(
      expect.objectContaining({ authorize: mocks.requireStaffForAction }),
    );
  });
});
