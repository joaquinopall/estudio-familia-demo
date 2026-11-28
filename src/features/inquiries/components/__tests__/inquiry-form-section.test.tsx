import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The form itself is covered by inquiry-form.test.tsx; here only the section around it.
vi.mock("@/features/inquiries/components/inquiry-form", () => ({
  InquiryForm: () => <form aria-label="formulario" />,
}));

import { inquiryFormContent as copy } from "@/content/inquiry-form";
import { InquiryFormSection } from "@/features/inquiries/components/inquiry-form-section";

describe("InquiryFormSection: demo notice (FR-15, F5-08)", () => {
  it("in demo mode, asks not to write real data, before the form", () => {
    render(<InquiryFormSection demoMode />);

    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(copy.demoNotice.title);
    expect(note).toHaveTextContent("No escribas datos reales");
    // Before the form, so it is read first.
    const form = screen.getByRole("form", { name: "formulario" });
    expect(note.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("a real firm (demo mode off) never shows it", () => {
    render(<InquiryFormSection demoMode={false} />);

    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.queryByText(copy.demoNotice.title)).toBeNull();
  });

  it("never promises an answer nor names a practice area", () => {
    const text = `${copy.demoNotice.title} ${copy.demoNotice.body}`;

    expect(text).not.toMatch(/te (vamos a )?contact/i);
    expect(text).not.toMatch(/sucesi|divorcio|alimentos/i);
  });
});
