/**
 * End-to-end submission of an inquiry (US-03, FR-04, FR-06, FR-07, SPEC §13): real browser,
 * Turnstile test keys, the dev database and Resend's test addresses (no real inbox).
 *
 * Writes rows whose email carries e2e-<run>-<scenario> and deletes them at the end, even
 * if a test fails. Also deletes E2E- rows older than a day (runs cut short).
 * Skipped without DATABASE_URL or without Turnstile's passing test key.
 */
import { randomUUID } from "node:crypto";

import { type Page, expect, test } from "@playwright/test";

import { privacyPolicy } from "../../src/content/legal/privacy";
import { collectCspViolations } from "./support/csp";
import {
  deleteInquiriesByMarker,
  deleteStaleE2eInquiries,
  findInquiryByMarker,
  usesTurnstileTestKey,
} from "./support/db";
import { DEV_SERVICES_SKIP_REASON, hasDevServices } from "./support/services";

const RUN = randomUUID().slice(0, 8);
const marker = (scenario: string) => `E2E-${RUN}-${scenario}`;

/**
 * A documentation IPv6 (2001:db8::/32) per run and scenario. Locally, Next only sets
 * x-forwarded-for when the request has none, so each scenario gets its own rate limit bucket
 * instead of sharing ::1 with other runs and manual tests (5 per IP every 10 minutes).
 * On Vercel the platform overwrites this header.
 */
const clientIp = (scenario: number) =>
  `2001:db8:${RUN.slice(0, 4)}:${RUN.slice(4, 8)}::${scenario}`;

test.describe("inquiry submission (US-03)", () => {
  test.skip(!hasDevServices(), DEV_SERVICES_SKIP_REASON);
  test.skip(
    !usesTurnstileTestKey(),
    "Needs Turnstile's passing test site key: the e2e never solve a real challenge.",
  );

  test.afterAll(async () => {
    const deleted =
      (await deleteInquiriesByMarker(`E2E-${RUN}-`)) + (await deleteStaleE2eInquiries());
    test.info().annotations.push({ type: "cleanup", description: `${deleted} E2E- rows deleted` });
    expect(await findInquiryByMarker(marker("safe"))).toBeNull();
    expect(await findInquiryByMarker(marker("unsafe"))).toBeNull();
  });

  async function fillDetails(page: Page, message: string) {
    const form = page.locator("#formulario");
    await form.getByLabel("Sin apuro").check();
    await form.getByLabel("Contanos tu caso").fill(message);
    await form.getByRole("button", { name: "Siguiente" }).click();
    await expect(form.getByRole("heading", { name: /Tus datos/ })).toBeFocused();
  }

  async function fillContact(
    page: Page,
    options: { email: string; emailPrivate: boolean; safe: boolean },
  ) {
    const form = page.locator("#formulario");
    await form.getByLabel("Nombre y apellido").fill("Prueba Automatizada");
    await form.locator('input[type="email"]').fill(options.email);
    await form
      .getByLabel(options.emailPrivate ? "Sí, solo lo leo yo" : "No, otra persona puede leerlo")
      .check();
    // "Teléfono" is also a channel option: target the field by type.
    await form.locator('input[type="tel"]').fill("+54 9 11 5555-1234");
    await form.locator('input[name="preferredChannel"][value="WHATSAPP"]').check();
    await form.getByLabel(options.safe ? "Sí, es seguro" : "No, prefiero que no").check();
    await form.getByRole("checkbox").check();
    // Turnstile's test key solves itself and fills the hidden field.
    await expect(form.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
      timeout: 20_000,
    });
  }

  async function submitAndReadReference(page: Page): Promise<string> {
    const form = page.locator("#formulario");
    await form.getByRole("button", { name: "Enviar consulta" }).click();
    const title = form.getByRole("heading", { name: "Recibimos tu consulta" });
    await expect(title).toBeVisible({ timeout: 20_000 });
    const reference = (await form.textContent())?.match(/C-[0-9A-F]{8}/)?.[0];
    expect(reference, "the confirmation shows the reference").toBeTruthy();
    return reference ?? "";
  }

  test("with a safe channel: from an area page to the confirmation, stored with its event", async ({
    page,
  }) => {
    const violations = await collectCspViolations(page);
    const id = marker("safe");
    await page.setExtraHTTPHeaders({ "x-forwarded-for": clientIp(1) });

    await page.goto("/areas/sucesiones");
    await page.getByRole("main").getByRole("link", { name: "Contanos tu caso" }).first().click();
    await expect(page).toHaveURL(/\/contacto\?area=sucesiones/);
    await expect(page.getByLabel("¿Sobre qué es tu consulta?")).toHaveValue("SUCCESSION");

    await fillDetails(page, `${id} prueba automatizada del envío; se borra al terminar.`);
    await fillContact(page, {
      email: `delivered+${id.toLowerCase()}@resend.dev`,
      emailPrivate: true,
      safe: true,
    });
    const reference = await submitAndReadReference(page);

    await expect(page.locator("#formulario")).toContainText(
      "Te vamos a contactar por el medio que nos indicaste como seguro",
    );

    const stored = await findInquiryByMarker(id);
    expect(stored).toMatchObject({
      area: "SUCCESSION",
      status: "NEW",
      preferredChannel: "WHATSAPP",
      safeToContact: true,
      emailIsPrivate: true,
      privacyPolicyVersion: privacyPolicy.version,
      events: ["CREATED"],
      // F5-02 (ADR-0017): the message is never stored as text.
      messageIsEncrypted: true,
    });
    expect(`C-${stored?.id.slice(0, 8).toUpperCase()}`).toBe(reference);
    expect(violations).toEqual([]);
  });

  test("without a safe channel: the confirmation does not promise contact (US-03 CA3, CA7)", async ({
    page,
  }) => {
    const id = marker("unsafe");
    await page.setExtraHTTPHeaders({ "x-forwarded-for": clientIp(2) });

    await page.goto("/contacto");
    await page.getByLabel("¿Sobre qué es tu consulta?").selectOption("DIVORCE");
    await fillDetails(page, `${id} prueba automatizada sin medio seguro; se borra al terminar.`);
    await fillContact(page, {
      email: `delivered+${id.toLowerCase()}@resend.dev`,
      emailPrivate: false,
      safe: false,
    });
    await submitAndReadReference(page);

    const form = page.locator("#formulario");
    await expect(form).toContainText("no vamos a iniciar el contacto");
    await expect(form).not.toContainText("Te vamos a contactar");

    expect(await findInquiryByMarker(id)).toMatchObject({
      area: "DIVORCE",
      safeToContact: false,
      emailIsPrivate: false,
      events: ["CREATED"],
    });
  });
});
