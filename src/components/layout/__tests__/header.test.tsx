import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Header } from "@/components/layout/header";
import { siteConfig } from "@/config/site.config";

function renderHeader() {
  render(
    <Header
      shortName={siteConfig.shortName}
      navigation={siteConfig.navigation}
      primaryCta={siteConfig.primaryCta}
    />,
  );
}

describe("Header", () => {
  it("links the firm name to the home page", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: `${siteConfig.shortName} — Inicio` })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders every navigation item from the config in the main nav", () => {
    renderHeader();
    const nav = screen.getByRole("navigation", { name: "Principal" });

    for (const item of siteConfig.navigation) {
      expect(within(nav).getByRole("link", { name: item.label })).toHaveAttribute(
        "href",
        item.href,
      );
    }
  });
});

describe("MobileMenu", () => {
  const menuButton = () => screen.getByRole("button", { name: "Menú" });

  it("starts closed and opens with the button (aria-expanded)", () => {
    renderHeader();

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Principal (móvil)" })).not.toBeInTheDocument();

    fireEvent.click(menuButton());

    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
    const mobileNav = screen.getByRole("navigation", { name: "Principal (móvil)" });
    expect(within(mobileNav).getAllByRole("link")).toHaveLength(siteConfig.navigation.length + 1);
  });

  it("points aria-controls to the panel it toggles", () => {
    renderHeader();
    fireEvent.click(menuButton());

    const panelId = menuButton().getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId ?? "")).toContainElement(
      screen.getByRole("navigation", { name: "Principal (móvil)" }),
    );
  });

  it("closes with Escape and returns focus to the button", () => {
    renderHeader();
    fireEvent.click(menuButton());

    fireEvent.keyDown(document, { key: "Escape" });

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuButton()).toHaveFocus();
  });

  it("closes when a link is chosen", () => {
    renderHeader();
    fireEvent.click(menuButton());
    const mobileNav = screen.getByRole("navigation", { name: "Principal (móvil)" });

    fireEvent.click(within(mobileNav).getByRole("link", { name: "Contacto" }));

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });
});
