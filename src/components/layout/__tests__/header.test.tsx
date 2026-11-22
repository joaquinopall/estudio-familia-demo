import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Header } from "@/components/layout/header";
import { siteConfig } from "@/config/site.config";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
afterEach(() => {
  navigation.pathname = "/";
});

function renderHeader() {
  render(
    <Header
      shortName={siteConfig.shortName}
      navigation={siteConfig.navigation}
      primaryCta={siteConfig.primaryCta}
      whatsApp={{ number: "5491100000000", message: "Hola" }}
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

describe("current page", () => {
  it.each([
    ["/", "Inicio", "page"],
    ["/nosotros", "Nosotros", "page"],
    ["/areas/divorcio", "Áreas de práctica", "true"],
  ])("on %s marks %s (aria-current=%s)", (pathname, label, value) => {
    navigation.pathname = pathname;
    renderHeader();

    const nav = screen.getByRole("navigation", { name: "Principal" });
    const marked = within(nav)
      .getAllByRole("link")
      .filter((link) => link.hasAttribute("aria-current"));
    expect(marked.map((link) => link.textContent)).toEqual([label]);
    expect(marked[0]).toHaveAttribute("aria-current", value);
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

  it("closes when focus leaves it", () => {
    renderHeader();
    fireEvent.click(menuButton());

    fireEvent.focusOut(menuButton(), { relatedTarget: document.body });

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("stays open while focus moves inside it", () => {
    renderHeader();
    fireEvent.click(menuButton());
    const mobileNav = screen.getByRole("navigation", { name: "Principal (móvil)" });

    fireEvent.focusOut(menuButton(), {
      relatedTarget: within(mobileNav).getByRole("link", { name: "Nosotros" }),
    });

    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
  });

  it("closes when pressing outside", () => {
    renderHeader();
    fireEvent.click(menuButton());

    fireEvent.pointerDown(document.body);

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when a link is chosen", () => {
    renderHeader();
    fireEvent.click(menuButton());
    const mobileNav = screen.getByRole("navigation", { name: "Principal (móvil)" });

    fireEvent.click(within(mobileNav).getByRole("link", { name: "Contacto" }));

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });
});
