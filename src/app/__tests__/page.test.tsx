import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/(public)/page";
import { siteConfig } from "@/config/site.config";

describe("Home page (placeholder)", () => {
  it("renders a single level-1 heading", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("has the primary call to action", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: siteConfig.primaryCta.label })).toHaveAttribute(
      "href",
      siteConfig.primaryCta.href,
    );
  });
});
