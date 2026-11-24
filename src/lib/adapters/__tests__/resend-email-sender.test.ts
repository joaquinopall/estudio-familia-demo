// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { ResendEmailSender, type ResendEmailsClient } from "@/lib/adapters/resend-email-sender";

const FROM = "Estudio <avisos@example.com>";
const MESSAGE = {
  to: "ana@example.com",
  subject: "Recibimos tu mensaje",
  html: "<p>Hola</p>",
  text: "Hola",
};

function clientReturning(impl: ResendEmailsClient["emails"]["send"]): {
  client: ResendEmailsClient;
  send: ReturnType<typeof vi.fn>;
} {
  const send = vi.fn(impl);
  return { client: { emails: { send } }, send };
}

describe("ResendEmailSender", () => {
  it("sends from EMAIL_FROM with html and text, and returns the id", async () => {
    const { client, send } = clientReturning(async () => ({
      data: { id: "re_123" },
      error: null,
      headers: null,
    }));

    const result = await new ResendEmailSender(client, FROM).send(MESSAGE);

    expect(result).toEqual({ ok: true, id: "re_123" });
    expect(send).toHaveBeenCalledWith({ from: FROM, ...MESSAGE }, undefined);
  });

  it("passes the idempotency key as a request option", async () => {
    const { client, send } = clientReturning(async () => ({
      data: { id: "re_1" },
      error: null,
      headers: null,
    }));

    await new ResendEmailSender(client, FROM).send({
      ...MESSAGE,
      idempotencyKey: "inquiry-receipt/123",
    });

    expect(send).toHaveBeenCalledWith(expect.anything(), { idempotencyKey: "inquiry-receipt/123" });
  });

  it("returns the provider error code when the API rejects the email", async () => {
    const { client } = clientReturning(async () => ({
      data: null,
      error: { name: "validation_error", message: "Invalid `to` field", statusCode: 422 },
      headers: null,
    }));

    expect(await new ResendEmailSender(client, FROM).send(MESSAGE)).toEqual({
      ok: false,
      errorCode: "validation_error",
    });
  });

  it("never throws: a network failure becomes network_error", async () => {
    const { client } = clientReturning(async () => {
      throw new TypeError("fetch failed");
    });

    expect(await new ResendEmailSender(client, FROM).send(MESSAGE)).toEqual({
      ok: false,
      errorCode: "network_error",
    });
  });

  it("treats a response without data or error as a failure", async () => {
    const { client } = clientReturning(
      async () => ({ data: null, error: null, headers: null }) as never,
    );

    expect(await new ResendEmailSender(client, FROM).send(MESSAGE)).toEqual({
      ok: false,
      errorCode: "unknown_error",
    });
  });
});
