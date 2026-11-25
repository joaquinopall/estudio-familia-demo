import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { inquiryFormContent as copy } from "@/content/inquiry-form";
import type { SubmitInquiryState } from "@/features/inquiries/submit-inquiry";

const mocks = vi.hoisted(() => ({
  submitInquiry: vi.fn(),
  turnstileProps: [] as { resetKey: number }[],
  searchParams: new URLSearchParams(),
}));

vi.mock("@/features/inquiries/actions", () => ({ submitInquiry: mocks.submitInquiry }));
vi.mock("@/features/inquiries/components/turnstile-widget", () => ({
  TurnstileWidget: (props: { resetKey: number }) => {
    mocks.turnstileProps.push(props);
    return (
      <input type="hidden" name="cf-turnstile-response" value="XXXX.DUMMY.TOKEN.XXXX" readOnly />
    );
  },
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => mocks.searchParams }));

const { InquiryForm } = await import("@/features/inquiries/components/inquiry-form");
const { InquiryFormFromQuery } =
  await import("@/features/inquiries/components/inquiry-form-from-query");

const RESPONSE_TIME = "Te respondemos dentro de las próximas 24 a 48 horas hábiles.";
const props = {
  turnstileSiteKey: "1x00000000000000000000AA",
  responseTime: RESPONSE_TIME,
  noscriptContacts: <p>WhatsApp, teléfono y email</p>,
};

const stepSection = (title: string) =>
  screen
    .getByRole("heading", { name: new RegExp(title), hidden: true })
    .closest("section") as HTMLElement;
const details = () => stepSection(copy.steps.details.title);
const contact = () => stepSection(copy.steps.contact.title);

function fillDetails() {
  fireEvent.change(screen.getByLabelText(copy.fields.area.label), {
    target: { value: "DIVORCE" },
  });
  fireEvent.click(screen.getByLabelText("En las próximas semanas"));
  fireEvent.change(screen.getByLabelText(copy.fields.message.label), {
    target: { value: "Nos estamos separando y queremos acordar el cuidado de los chicos." },
  });
}

function fillContact({ channel = "WhatsApp", safe = true, emailPrivate = true } = {}) {
  fireEvent.change(screen.getByLabelText(copy.fields.fullName.label), {
    target: { value: "Ana Pérez" },
  });
  fireEvent.change(
    screen.getByLabelText(copy.fields.email.label, { selector: 'input[type="email"]' }),
    {
      target: { value: "ana@example.com" },
    },
  );
  fireEvent.change(screen.getByLabelText(copy.fields.phone.label), {
    target: { value: "+54 9 11 5555-1234" },
  });
  fireEvent.click(
    screen.getByLabelText(
      emailPrivate ? copy.fields.emailIsPrivate.yes : copy.fields.emailIsPrivate.no,
    ),
  );
  fireEvent.click(within(contact()).getByLabelText(channel, { selector: 'input[type="radio"]' }));
  if (channel !== "Email") {
    fireEvent.click(
      screen.getByLabelText(safe ? copy.fields.safeToContact.yes : copy.fields.safeToContact.no),
    );
  }
  fireEvent.click(screen.getByRole("checkbox"));
}

const next = () => fireEvent.click(screen.getByRole("button", { name: copy.buttons.next }));
const submit = () => fireEvent.click(screen.getByRole("button", { name: copy.buttons.submit }));

function respondWith(state: SubmitInquiryState) {
  mocks.submitInquiry.mockImplementation(async () => state);
}

describe("InquiryForm (US-03)", () => {
  beforeEach(() => {
    mocks.submitInquiry.mockReset();
    mocks.turnstileProps.length = 0;
    mocks.searchParams = new URLSearchParams();
  });

  describe("steps (CA1)", () => {
    it("starts on step 1 with step 2 hidden", () => {
      render(<InquiryForm {...props} />);

      expect(details()).toBeVisible();
      expect(contact()).not.toBeVisible();
    });

    it("does not advance with empty fields and shows every error of step 1 (CA2)", async () => {
      render(<InquiryForm {...props} />);
      next();

      const summary = await screen.findByRole("alert");
      expect(summary).toHaveTextContent("Elegí el tipo de consulta");
      expect(summary).toHaveTextContent("Indicá la urgencia");
      expect(summary).toHaveTextContent("Contanos un poco más (mínimo 20 caracteres)");
      await waitFor(() => expect(summary).toHaveFocus());
      expect(contact()).not.toBeVisible();

      const message = screen.getByLabelText(copy.fields.message.label);
      expect(message).toHaveAttribute("aria-invalid", "true");
      expect(message).toHaveAccessibleDescription(/mínimo 20 caracteres/);
    });

    it("links each error of the summary to its field", async () => {
      render(<InquiryForm {...props} />);
      next();

      const link = within(await screen.findByRole("alert")).getByRole("link", {
        name: "Contanos un poco más (mínimo 20 caracteres)",
      });
      expect(link).toHaveAttribute("href", "#inquiry-message");
    });

    it("advances with a valid step 1, focuses step 2, and going back keeps everything", async () => {
      render(<InquiryForm {...props} />);
      fillDetails();
      next();

      expect(contact()).toBeVisible();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: new RegExp(copy.steps.contact.title) }),
        ).toHaveFocus(),
      );

      fireEvent.click(screen.getByRole("button", { name: copy.buttons.back }));
      expect(details()).toBeVisible();
      expect(screen.getByLabelText(copy.fields.message.label)).toHaveValue(
        "Nos estamos separando y queremos acordar el cuidado de los chicos.",
      );
    });
  });

  describe("safe contact questions (CA6, CA7)", () => {
    it("has no default answer and an unchecked consent", () => {
      render(<InquiryForm {...props} />);

      for (const name of ["emailIsPrivate", "urgency", "preferredChannel"]) {
        for (const radio of document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)) {
          expect(radio.checked).toBe(false);
        }
      }
      expect(screen.getByRole("checkbox", { hidden: true })).not.toBeChecked();
    });

    it("asks whether the channel is safe only for phone and WhatsApp", () => {
      render(<InquiryForm {...props} />);
      fillDetails();
      next();
      const question = () => screen.queryByText(copy.fields.safeToContact.legend);

      expect(question()).toBeNull();
      fireEvent.click(
        within(contact()).getByLabelText("Teléfono", { selector: 'input[type="radio"]' }),
      );
      expect(question()).toBeInTheDocument();
      fireEvent.click(
        within(contact()).getByLabelText("Email", { selector: 'input[type="radio"]' }),
      );
      expect(question()).toBeNull();
      fireEvent.click(
        within(contact()).getByLabelText("WhatsApp", { selector: 'input[type="radio"]' }),
      );
      expect(question()).toBeInTheDocument();
    });

    it("links to the privacy policy in a new tab, so nothing typed is lost", () => {
      render(<InquiryForm {...props} />);
      const link = screen.getByRole("link", { name: /política de privacidad/, hidden: true });

      expect(link).toHaveAttribute("href", "/privacidad");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  describe("sending", () => {
    it("does not send when step 2 is invalid, and shows its errors", async () => {
      render(<InquiryForm {...props} />);
      fillDetails();
      next();
      submit();

      const summary = await screen.findByRole("alert");
      expect(summary).toHaveTextContent("Ingresá tu nombre");
      expect(summary).toHaveTextContent("Decinos si este email es privado");
      expect(summary).toHaveTextContent("Necesitamos tu consentimiento para responderte");
      expect(mocks.submitInquiry).not.toHaveBeenCalled();
    });

    it("sends every field and the Turnstile token, then confirms with the reference (CA3)", async () => {
      respondWith({ ok: true, data: { reference: "C-7F3A9B21", doNotContact: false } });
      render(<InquiryForm {...props} />);
      fillDetails();
      next();
      fillContact();
      await act(async () => submit());

      const formData = mocks.submitInquiry.mock.calls[0]?.[1] as FormData;
      expect(Object.fromEntries(formData)).toMatchObject({
        area: "DIVORCE",
        urgency: "NORMAL",
        fullName: "Ana Pérez",
        preferredChannel: "WHATSAPP",
        safeToContact: "true",
        emailIsPrivate: "true",
        consent: "on",
        website: "",
        "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
      });

      const confirmation = await screen.findByRole("heading", { name: copy.confirmation.title });
      const box = confirmation.parentElement as HTMLElement;
      expect(box).toHaveTextContent("C-7F3A9B21");
      expect(box).toHaveTextContent(RESPONSE_TIME);
      await waitFor(() => expect(box).toHaveFocus());
    });

    it("does not promise contact without a safe channel (CA3, CA7)", async () => {
      respondWith({ ok: true, data: { reference: "C-7F3A9B21", doNotContact: true } });
      render(<InquiryForm {...props} />);
      fillDetails();
      next();
      fillContact({ safe: false, emailPrivate: false });
      await act(async () => submit());

      const box = (await screen.findByRole("heading", { name: copy.confirmation.title }))
        .parentElement as HTMLElement;
      expect(box).toHaveTextContent(copy.confirmation.doNotContactNote);
      expect(box).not.toHaveTextContent(RESPONSE_TIME);
    });

    it("goes back to step 1 with the server's error and keeps what was typed (CA2, CA4)", async () => {
      respondWith({
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Revisá los datos marcados e intentá de nuevo.",
          fieldErrors: { message: ["Máximo 2000 caracteres"] },
        },
        values: {
          area: "DIVORCE",
          message: "Texto que el servidor rechazó.",
          fullName: "Ana Pérez",
        },
      });
      render(<InquiryForm {...props} />);
      fillDetails();
      next();
      fillContact();
      await act(async () => submit());

      await waitFor(() => expect(details()).toBeVisible());
      expect(screen.getByRole("alert")).toHaveTextContent("Máximo 2000 caracteres");
      expect(screen.getByLabelText(copy.fields.message.label)).toHaveValue(
        "Texto que el servidor rechazó.",
      );
      expect(screen.getByLabelText(copy.fields.fullName.label)).toHaveValue("Ana Pérez");
    });

    it("shows a general error and gets a new Turnstile token after CAPTCHA_FAILED", async () => {
      respondWith({
        ok: false,
        error: { code: "CAPTCHA_FAILED", message: "No pudimos verificar el formulario." },
        values: {},
      });
      render(<InquiryForm {...props} />);
      fillDetails();
      next();
      fillContact();
      await act(async () => submit());

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "No pudimos verificar el formulario.",
      );
      expect(contact()).toBeVisible();
      expect(mocks.turnstileProps.at(-1)?.resetKey).toBeGreaterThan(0);
    });
  });

  describe("honeypot and preselected area", () => {
    it("keeps the honeypot out of reach of the keyboard and screen readers", () => {
      const { container } = render(<InquiryForm {...props} />);
      const honeypot = container.querySelector('input[name="website"]') as HTMLInputElement;

      expect(honeypot).toHaveAttribute("tabindex", "-1");
      expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it("preselects the area from ?area=<slug>", () => {
      mocks.searchParams = new URLSearchParams("area=sucesiones");
      render(<InquiryFormFromQuery {...props} areaBySlug={{ sucesiones: "SUCCESSION" }} />);

      expect(screen.getByLabelText(copy.fields.area.label)).toHaveValue("SUCCESSION");
    });

    it.each(["inventada", "constructor", "__proto__"])("ignores an unknown slug (%s)", (slug) => {
      mocks.searchParams = new URLSearchParams(`area=${slug}`);
      render(<InquiryFormFromQuery {...props} areaBySlug={{ sucesiones: "SUCCESSION" }} />);

      expect(screen.getByLabelText(copy.fields.area.label)).toHaveValue("");
    });
  });

  describe("without JavaScript (FR-04)", () => {
    it("renders both steps visible, no step buttons, and the note about Turnstile", () => {
      const html = renderToStaticMarkup(<InquiryForm {...props} />);

      expect(html).not.toMatch(/<section[^>]*hidden/);
      expect(html).not.toContain(copy.buttons.next);
      expect(html).toContain(copy.buttons.submit);
      expect(html).toContain(copy.fields.safeToContact.legend);
      expect(html).toContain("<noscript>");
    });
  });
});
