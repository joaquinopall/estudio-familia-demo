import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { ContentList } from "@/components/marketing/content-list";

describe("Breadcrumbs", () => {
  it("links every ancestor and marks the last item as the current page", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Áreas", href: "/areas" },
          { label: "Sucesiones", href: "/areas/sucesiones" },
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Ruta" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/", "/areas"]);
    expect(within(nav).getByText("Sucesiones")).toHaveAttribute("aria-current", "page");
    expect(within(nav).getAllByRole("listitem")).toHaveLength(3);
  });
});

describe("ContentList", () => {
  it("renders each item in a list", () => {
    render(<ContentList items={["Uno", "Dos"]} />);

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Uno", "Dos"]);
  });
});
