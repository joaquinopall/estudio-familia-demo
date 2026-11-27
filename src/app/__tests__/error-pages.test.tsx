import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PublicError from "@/app/(public)/error";
import PublicNotFound from "@/app/(public)/not-found";
import RootError from "@/app/error";
import RootNotFound, { metadata } from "@/app/not-found";
import { errorContent, errorPagesLinks, notFoundContent } from "@/content/error-pages";

function expectWaysOut(container: HTMLElement) {
  for (const { label, href } of Object.values(errorPagesLinks)) {
    expect(within(container).getByRole("link", { name: label })).toHaveAttribute("href", href);
  }
}

describe("404 pages (FR-16)", () => {
  it("has its own title", () => {
    expect(metadata.title).toBe(notFoundContent.metaTitle);
  });

  it("inside the public layout, shows the message and links, without a second main", () => {
    const { container } = render(<PublicNotFound />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(notFoundContent.title);
    expect(screen.queryByRole("main")).toBeNull();
    expectWaysOut(container);
  });

  it("for unmatched URLs, brings the header and the footer with it", () => {
    render(<RootNotFound />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expectWaysOut(screen.getByRole("main"));
  });
});

describe.each([
  ["public", PublicError],
  ["root", RootError],
] as const)("%s error page (FR-16)", (_name, ErrorPage) => {
  const error = new Error("connection to 10.0.0.5 refused");

  it("offers retry, home and contact", () => {
    const retry = vi.fn();
    const { container } = render(<ErrorPage error={error} retry={retry} />);

    fireEvent.click(screen.getByRole("button", { name: errorContent.retryLabel }));
    expect(retry).toHaveBeenCalledOnce();
    expectWaysOut(container);
  });

  it("never shows internal details (CLAUDE.md §4)", () => {
    const { container } = render(<ErrorPage error={error} retry={vi.fn()} />);

    expect(container).not.toHaveTextContent(error.message);
  });

  it("shows Next's digest, to find the error in the log (F5-04), and nothing else", () => {
    const withDigest = Object.assign(new Error("connection to 10.0.0.5 refused"), {
      digest: "3802741954",
    });
    const { container } = render(<ErrorPage error={withDigest} retry={vi.fn()} />);

    expect(container).toHaveTextContent(`${errorContent.codeLabel} 3802741954`);
    expect(container).not.toHaveTextContent("10.0.0.5");
  });

  it("shows no code line when the error has no digest", () => {
    render(<ErrorPage error={error} retry={vi.fn()} />);

    expect(screen.queryByText(errorContent.codeLabel)).toBeNull();
  });

  it("moves focus to the title, so the change is announced", () => {
    render(<ErrorPage error={error} retry={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });
});
