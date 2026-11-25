import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { adminPanelContent } from "@/content/admin-panel";
import { InquiryFilters } from "@/features/inquiries/components/inquiry-filters";
import { InquiryPagination } from "@/features/inquiries/components/inquiry-pagination";
import { InquiryTable } from "@/features/inquiries/components/inquiry-table";
import { listFiltersSchema } from "@/features/inquiries/schema";
import type { InquirySummary } from "@/features/inquiries/types";

const copy = adminPanelContent.list;
const TZ = "America/Argentina/Buenos_Aires";

const item = (overrides: Partial<InquirySummary> = {}): InquirySummary => ({
  id: "7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b",
  reference: "C-7F3A9B21",
  createdAt: new Date("2026-11-25T17:05:00Z"),
  fullName: "Ana Pérez",
  email: "ana@example.com",
  area: "SUCCESSION",
  urgency: "HIGH",
  status: "NEW",
  preferredChannel: "WHATSAPP",
  doNotContact: false,
  ...overrides,
});

const filters = (params: Record<string, string> = {}) => listFiltersSchema.parse(params);

describe("InquiryTable", () => {
  it("is a captioned table with a header per column", () => {
    render(<InquiryTable items={[item()]} timeZone={TZ} />);

    const table = screen.getByRole("table", { name: copy.table.caption });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual([
      copy.table.date,
      copy.table.reference,
      copy.table.person,
      copy.table.area,
      copy.table.urgency,
      copy.table.status,
      copy.table.contact,
    ]);
  });

  it("shows each row with the firm's time, name and email, labels and badges", () => {
    render(<InquiryTable items={[item()]} timeZone={TZ} />);
    const row = screen.getAllByRole("row")[1] as HTMLElement;

    expect(within(row).getByText(/14:05/)).toHaveAttribute("datetime", "2026-11-25T17:05:00.000Z");
    expect(within(row).getByText("Ana Pérez")).toBeInTheDocument();
    expect(within(row).getByText("ana@example.com")).toBeInTheDocument();
    expect(within(row).getByText("Sucesiones")).toBeInTheDocument();
    expect(within(row).getByText("Alta")).toBeInTheDocument();
    expect(within(row).getByText("Nueva")).toBeInTheDocument();
    expect(within(row).getByText("WhatsApp")).toBeInTheDocument();
  });

  it("links the reference to the detail of the inquiry", () => {
    render(<InquiryTable items={[item()]} timeZone={TZ} />);

    expect(screen.getByRole("link", { name: "C-7F3A9B21" })).toHaveAttribute(
      "href",
      "/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b",
    );
  });

  it("highlights 'No iniciar contacto' instead of the channel (US-03 CA7)", () => {
    render(<InquiryTable items={[item({ doNotContact: true })]} timeZone={TZ} />);
    const row = screen.getAllByRole("row")[1] as HTMLElement;

    expect(within(row).getByText(copy.table.doNotContact)).toBeInTheDocument();
    expect(within(row).queryByText("WhatsApp")).not.toBeInTheDocument();
  });

  it("never shows the message or the phone (they belong to the detail)", () => {
    render(<InquiryTable items={[item()]} timeZone={TZ} />);

    expect(document.body.textContent).not.toMatch(/\+54|mensaje/i);
  });

  it("scrolls inside a named, focusable region on narrow screens", () => {
    render(<InquiryTable items={[item()]} timeZone={TZ} />);

    expect(screen.getByRole("region", { name: copy.table.region })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });
});

describe("InquiryFilters", () => {
  it("is a GET form to /admin with a labelled control per filter", () => {
    render(<InquiryFilters filters={filters()} />);
    const form = screen.getByRole("search", { name: copy.filters.legend });

    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin");
    expect(screen.getByLabelText(copy.filters.status)).toHaveAttribute("name", "status");
    expect(screen.getByLabelText(copy.filters.area)).toHaveAttribute("name", "area");
    expect(screen.getByLabelText(copy.filters.urgency)).toHaveAttribute("name", "urgency");
    expect(screen.getByLabelText(copy.filters.search)).toHaveAccessibleDescription(
      copy.filters.searchHint,
    );
  });

  it("starts with 'all' selected and no 'clear' link", () => {
    render(<InquiryFilters filters={filters()} />);

    expect(screen.getByLabelText(copy.filters.status)).toHaveValue("");
    expect(screen.queryByRole("link", { name: copy.filters.clear })).not.toBeInTheDocument();
  });

  it("shows the current filters from the URL and offers to clear them", () => {
    render(
      <InquiryFilters filters={filters({ status: "IN_REVIEW", urgency: "HIGH", q: "ana" })} />,
    );

    expect(screen.getByLabelText(copy.filters.status)).toHaveValue("IN_REVIEW");
    expect(screen.getByLabelText(copy.filters.urgency)).toHaveValue("HIGH");
    expect(screen.getByLabelText(copy.filters.search)).toHaveValue("ana");
    expect(screen.getByRole("link", { name: copy.filters.clear })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("lists every status, area and urgency in Spanish", () => {
    render(<InquiryFilters filters={filters()} />);

    expect(within(screen.getByLabelText(copy.filters.status)).getAllByRole("option")).toHaveLength(
      6,
    );
    expect(within(screen.getByLabelText(copy.filters.area)).getAllByRole("option")).toHaveLength(7);
    expect(
      within(screen.getByLabelText(copy.filters.urgency))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([copy.filters.allUrgencies, "Baja", "Normal", "Alta"]);
  });
});

describe("InquiryPagination", () => {
  const nav = () => screen.getByRole("navigation", { name: copy.pagination.label });

  it("on the first page: only 'Siguiente', keeping the filters", () => {
    render(
      <InquiryPagination
        filters={filters({ status: "NEW" })}
        result={{ page: 1, totalPages: 3, total: 45 }}
      />,
    );

    expect(within(nav()).getByText(/Página 1 de 3 · 45 consultas/)).toBeInTheDocument();
    expect(within(nav()).queryByRole("link", { name: copy.pagination.previous })).toBeNull();
    expect(within(nav()).getByRole("link", { name: copy.pagination.next })).toHaveAttribute(
      "href",
      "/admin?status=NEW&page=2",
    );
  });

  it("on the last page: only 'Anterior'", () => {
    render(
      <InquiryPagination
        filters={filters({ page: "3" })}
        result={{ page: 3, totalPages: 3, total: 45 }}
      />,
    );

    expect(within(nav()).getByRole("link", { name: copy.pagination.previous })).toHaveAttribute(
      "href",
      "/admin?page=2",
    );
    expect(within(nav()).queryByRole("link", { name: copy.pagination.next })).toBeNull();
  });

  it("uses the page actually shown, not the requested one (clamped)", () => {
    render(
      <InquiryPagination
        filters={filters({ page: "9" })}
        result={{ page: 2, totalPages: 2, total: 25 }}
      />,
    );

    expect(within(nav()).getByRole("link", { name: copy.pagination.previous })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("says '1 consulta' in singular", () => {
    render(<InquiryPagination filters={filters()} result={{ page: 1, totalPages: 1, total: 1 }} />);

    expect(within(nav()).getByText(/· 1 consulta$/)).toBeInTheDocument();
  });
});
