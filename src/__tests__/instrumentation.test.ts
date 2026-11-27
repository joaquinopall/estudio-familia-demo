// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  startErrorReporting: vi.fn(),
  flushErrorReports: vi.fn(async () => {}),
  getErrorReporter: vi.fn(() => null),
  lines: [] as string[],
}));

vi.mock("@/lib/error-reporting", () => ({
  startErrorReporting: mocks.startErrorReporting,
  flushErrorReports: mocks.flushErrorReports,
}));
vi.mock("@/lib/adapters", () => ({ getErrorReporter: mocks.getErrorReporter }));

import { onRequestError, register } from "@/instrumentation";

const context = {
  routerKind: "App Router",
  routePath: "/admin/consultas/[id]",
  routeType: "render",
  renderSource: "react-server-components",
  revalidateReason: undefined,
} as const;

const request = {
  path: "/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b?email=persona@example.com",
  method: "GET",
  headers: { cookie: "sb-session=secret", "x-forwarded-for": "190.0.0.1" },
};

describe("instrumentation (F5-04, NFR-OBS-01)", () => {
  beforeEach(() => {
    mocks.lines.length = 0;
    vi.spyOn(console, "error").mockImplementation((line: string) => mocks.lines.push(line));
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("register() starts error reporting with the composed reporter, on Node only", async () => {
    await register();
    expect(mocks.startErrorReporting).toHaveBeenCalledWith(null);

    mocks.startErrorReporting.mockClear();
    vi.stubEnv("NEXT_RUNTIME", "edge");
    await register();
    expect(mocks.startErrorReporting).not.toHaveBeenCalled();
  });

  it("logs request.error with the digest and the route pattern, and awaits the reports", async () => {
    const error = Object.assign(new Error("boom"), { digest: "3802741954" });

    await onRequestError(error, request, context);

    expect(JSON.parse(mocks.lines[0] ?? "{}")).toMatchObject({
      level: "error",
      event: "request.error",
      errorName: "Error",
      digest: "3802741954",
      route: "/admin/consultas/[id]",
      routeType: "render",
    });
    expect(mocks.flushErrorReports).toHaveBeenCalled();
  });

  it("never logs the message, the real path, cookies or the IP", async () => {
    const error = new Error("duplicate key: persona@example.com");

    await onRequestError(error, request, context);

    const line = mocks.lines.join("\n");
    expect(line).not.toContain("persona@example.com");
    expect(line).not.toContain("7f3a9b21");
    expect(line).not.toContain("sb-session");
    expect(line).not.toContain("190.0.0.1");
  });
});
