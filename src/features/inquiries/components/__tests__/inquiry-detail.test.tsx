import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { adminPanelContent } from "@/content/admin-panel";
import type { InquiryDetail as Detail } from "@/features/inquiries/types";

const mocks = vi.hoisted(() => ({ updateInquiryStatus: vi.fn(), updateInquiryNotes: vi.fn() }));
vi.mock("@/features/inquiries/actions", () => mocks);

const { InquiryDetail } = await import("@/features/inquiries/components/inquiry-detail");

const copy = adminPanelContent.detail;
const TZ = "America/Argentina/Buenos_Aires";

const detail = (overrides: Partial<Detail> = {}): Detail => ({
  id: "7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b",
  reference: "C-7F3A9B21",
  createdAt: new Date("2026-11-25T17:05:00.000Z"),
  updatedAt: new Date("2026-11-25T17:05:00.000Z"),
  fullName: "Ana Pérez",
  email: "ana@example.com",
  phone: "+54 9 11 5555-1234",
  area: "SUCCESSION",
  urgency: "HIGH",
  status: "NEW",
  message: "Falleció mi papá.\nQueremos iniciar la sucesión.",
  preferredChannel: "WHATSAPP",
  safeToContact: true,
  emailIsPrivate: true,
  consentAt: new Date("2026-11-25T17:05:00.000Z"),
  privacyPolicyVersion: "1.1",
  source: null,
  internalNotes: null,
  doNotContact: false,
  contactChannel: "WHATSAPP",
  history: [
    {
      id: "e1",
      type: "CREATED",
      createdAt: new Date("2026-11-25T17:05:00.000Z"),
      fromStatus: null,
      toStatus: null,
      actor: { type: "website" },
    },
    {
      id: "e2",
      type: "STATUS_CHANGED",
      createdAt: new Date("2026-11-25T18:00:00.000Z"),
      fromStatus: "NEW",
      toStatus: "IN_REVIEW",
      actor: { type: "staff", name: "Laura Gómez" },
    },
    {
      id: "e3",
      type: "NOTES_UPDATED",
      createdAt: new Date("2026-11-25T18:10:00.000Z"),
      fromStatus: null,
      toStatus: null,
      actor: { type: "staff", name: null },
    },
  ],
  ...overrides,
});

const section = (title: string) => screen.getByRole("region", { name: title });

beforeEach(() => {
  mocks.updateInquiryStatus.mockReset();
  mocks.updateInquiryNotes.mockReset();
});

describe("InquiryDetail", () => {
  it("shows the reference, badges, the received time and a way back", () => {
    render(<InquiryDetail inquiry={detail()} timeZone={TZ} />);

    expect(screen.getByRole("heading", { level: 1, name: "C-7F3A9B21" })).toBeInTheDocument();
    expect(screen.getByText(copy.receivedAt, { exact: false })).toHaveTextContent(/14:05/);
    expect(screen.getByRole("link", { name: copy.backToList })).toHaveAttribute("href", "/admin");
  });

  it("says how to contact with the safe channel and its value", () => {
    render(<InquiryDetail inquiry={detail()} timeZone={TZ} />);
    const box = section(copy.contact.title);

    expect(box).toHaveTextContent("Contactar por WhatsApp: +54 9 11 5555-1234");
    expect(within(box).queryByText(copy.contact.fallbackNote)).toBeNull();
  });

  it("explains the fallback to the private email", () => {
    render(
      <InquiryDetail
        inquiry={detail({ safeToContact: false, contactChannel: "EMAIL" })}
        timeZone={TZ}
      />,
    );

    expect(section(copy.contact.title)).toHaveTextContent("Contactar por Email: ana@example.com");
    expect(screen.getByText(copy.contact.fallbackNote)).toBeInTheDocument();
  });

  it("highlights 'No iniciar contacto' without any channel to use (US-03 CA7)", () => {
    render(
      <InquiryDetail
        inquiry={detail({
          doNotContact: true,
          contactChannel: null,
          safeToContact: false,
          emailIsPrivate: false,
        })}
        timeZone={TZ}
      />,
    );

    const box = section(copy.contact.doNotContactTitle);
    expect(box).toHaveTextContent(copy.contact.doNotContactBody);
    expect(box).not.toHaveTextContent("Contactar por");
    expect(screen.getByText(`(${copy.person.emailNotPrivate})`)).toBeInTheDocument();
  });

  it("never links the phone or the email (no accidental contact, §11.5)", () => {
    const { container } = render(<InquiryDetail inquiry={detail()} timeZone={TZ} />);

    expect(
      container.querySelector('a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me"]'),
    ).toBeNull();
  });

  it("shows every field, the message with its line breaks and the consent", () => {
    render(<InquiryDetail inquiry={detail({ source: "google" })} timeZone={TZ} />);
    const person = section(copy.person.title);
    const inquiry = section(copy.inquiry.title);

    expect(person).toHaveTextContent("Ana Pérez");
    expect(person).toHaveTextContent(`ana@example.com (${copy.person.emailPrivate})`);
    expect(person).toHaveTextContent(`${copy.person.safeToContact}${copy.person.yes}`);
    expect(inquiry).toHaveTextContent("Sucesiones");
    expect(inquiry).toHaveTextContent("Tengo un plazo o una audiencia cercana");
    expect(within(inquiry).getByText(/Falleció mi papá/)).toHaveClass("whitespace-pre-wrap");
    expect(section(copy.consent.title)).toHaveTextContent("versión 1.1");
    expect(section(copy.consent.title)).toHaveTextContent("Origen: google");
  });

  it("covers a missing phone and an email channel", () => {
    render(
      <InquiryDetail
        inquiry={detail({
          phone: null,
          preferredChannel: "EMAIL",
          safeToContact: null,
          contactChannel: "EMAIL",
        })}
        timeZone={TZ}
      />,
    );

    expect(section(copy.person.title)).toHaveTextContent(copy.person.noPhone);
    expect(section(copy.person.title)).toHaveTextContent(copy.person.notAsked);
  });

  it("lists the history oldest first: what, when and who", () => {
    render(<InquiryDetail inquiry={detail()} timeZone={TZ} />);
    const items = within(section(copy.history.title)).getAllByRole("listitem");

    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringMatching(/Consulta recibida.*14:05.*Sitio web/),
      expect.stringMatching(/Estado: Nueva → En revisión.*15:00.*Laura Gómez/),
      expect.stringMatching(/Notas actualizadas.*15:10.*Staff/),
    ]);
  });
});

describe("StatusForm", () => {
  it("has a labelled select with the current status and posts the id", async () => {
    mocks.updateInquiryStatus.mockResolvedValue({
      ok: true,
      data: { status: "CLOSED", changed: true },
    });
    render(<InquiryDetail inquiry={detail()} timeZone={TZ} />);
    const select = screen.getByLabelText(copy.status.label);
    expect(select).toHaveValue("NEW");

    fireEvent.change(select, { target: { value: "CLOSED" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.status.submit }));
    });

    const formData = mocks.updateInquiryStatus.mock.calls[0]?.[1] as FormData;
    expect(formData.get("id")).toBe("7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b");
    expect(formData.get("status")).toBe("CLOSED");
    expect(within(section(copy.status.title)).getByRole("status")).toHaveTextContent(
      copy.status.changed,
    );
  });

  it("announces an error", async () => {
    mocks.updateInquiryStatus.mockResolvedValue({
      ok: false,
      error: { code: "FORBIDDEN", message: "No tenés permiso para realizar esta acción." },
    });
    render(<InquiryDetail inquiry={detail()} timeZone={TZ} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.status.submit }));
    });

    expect(within(section(copy.status.title)).getByRole("alert")).toHaveTextContent(
      "No tenés permiso",
    );
  });
});

describe("NotesForm", () => {
  it("shows the saved notes with a counter and the hint", () => {
    render(<InquiryDetail inquiry={detail({ internalNotes: "Hola" })} timeZone={TZ} />);
    const field = screen.getByLabelText(copy.notes.label, { selector: "textarea" });

    expect(field).toHaveValue("Hola");
    expect(field).toHaveAttribute("maxlength", "5000");
    // The hint and the counter are two spans of the same description.
    expect(field).toHaveAccessibleDescription(/Solo las ve el equipo del estudio/);
    expect(field).toHaveAccessibleDescription(/4 \/ 5000 caracteres/);
  });

  it("confirms a save", async () => {
    mocks.updateInquiryNotes.mockResolvedValue({
      ok: true,
      data: { updatedAt: new Date(), changed: true },
    });
    render(<InquiryDetail inquiry={detail()} timeZone={TZ} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.notes.submit }));
    });

    expect(within(section(copy.notes.title)).getByRole("status")).toHaveTextContent(
      copy.notes.saved,
    );
  });

  it("keeps the typed text and marks the field when the save is rejected", async () => {
    mocks.updateInquiryNotes.mockResolvedValue({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Revisá los datos marcados e intentá de nuevo.",
        fieldErrors: { notes: ["Las notas pueden tener hasta 5000 caracteres"] },
      },
      values: { notes: "Texto rechazado" },
    });
    render(<InquiryDetail inquiry={detail()} timeZone={TZ} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.notes.submit }));
    });

    const field = screen.getByLabelText(copy.notes.label, { selector: "textarea" });
    expect(field).toHaveValue("Texto rechazado");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/Las notas pueden tener hasta 5000 caracteres/);
  });
});
