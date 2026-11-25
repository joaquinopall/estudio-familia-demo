import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { adminPanelContent } from "@/content/admin-panel";
import type { SignInState } from "@/features/auth/sign-in";

const mocks = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock("@/features/auth/actions", () => ({ signIn: mocks.signIn, signOut: vi.fn() }));
const { LoginForm } = await import("@/features/auth/components/login-form");

const copy = adminPanelContent.login;
const INVALID = "El email o la contraseña no son correctos.";

const email = () => screen.getByLabelText(copy.email);
const password = () => screen.getByLabelText(copy.password);

function answerWith(state: SignInState) {
  mocks.signIn.mockImplementation(async () => state);
}

async function submitWith(values: { email: string; password: string }) {
  fireEvent.change(email(), { target: { value: values.email } });
  fireEvent.change(password(), { target: { value: values.password } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: copy.submit }));
  });
}

beforeEach(() => mocks.signIn.mockReset());

describe("LoginForm", () => {
  it("has labelled email and password fields with the right autocomplete", () => {
    render(<LoginForm />);

    expect(email()).toHaveAttribute("type", "email");
    expect(email()).toHaveAttribute("autocomplete", "username");
    expect(password()).toHaveAttribute("type", "password");
    expect(password()).toHaveAttribute("autocomplete", "current-password");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("works without JavaScript: a real form with named fields and a submit button", () => {
    const html = renderToStaticMarkup(<LoginForm />);

    expect(html).toContain("<form");
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain('type="submit"');
  });

  it("sends the typed email and password to signIn", async () => {
    answerWith(null);
    render(<LoginForm />);

    await submitWith({ email: "staff@example.com", password: "una-clave" });

    const formData = mocks.signIn.mock.calls[0]?.[1] as FormData;
    expect(formData.get("email")).toBe("staff@example.com");
    expect(formData.get("password")).toBe("una-clave");
  });

  it("announces the generic error, focuses it and keeps the email, not the password", async () => {
    answerWith({
      ok: false,
      error: { code: "UNAUTHORIZED", message: INVALID },
      values: { email: "staff@example.com" },
    });
    render(<LoginForm />);

    await submitWith({ email: "staff@example.com", password: "incorrecta" });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(INVALID);
    await waitFor(() => expect(alert).toHaveFocus());
    expect(email()).toHaveValue("staff@example.com");
    expect(password()).toHaveValue("");
  });

  it("shows field errors next to each field, linked for screen readers", async () => {
    answerWith({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Revisá los datos marcados e intentá de nuevo.",
        fieldErrors: { email: ["Ingresá un email válido"], password: ["Ingresá tu contraseña"] },
      },
      values: { email: "nope" },
    });
    render(<LoginForm />);

    await submitWith({ email: "nope", password: "" });

    expect(email()).toHaveAttribute("aria-invalid", "true");
    expect(email()).toHaveAccessibleDescription("Ingresá un email válido");
    expect(password()).toHaveAttribute("aria-invalid", "true");
    expect(password()).toHaveAccessibleDescription("Ingresá tu contraseña");
  });

  it("disables the button and says so while signing in", async () => {
    // A slow answer: the action stays pending for a moment, then fails.
    mocks.signIn.mockImplementation(
      () =>
        new Promise<SignInState>((resolve) =>
          setTimeout(
            () => resolve({ ok: false, error: { code: "INTERNAL", message: "x" }, values: {} }),
            50,
          ),
        ),
    );
    render(<LoginForm />);
    fireEvent.change(email(), { target: { value: "staff@example.com" } });
    fireEvent.change(password(), { target: { value: "una-clave" } });

    fireEvent.click(screen.getByRole("button", { name: copy.submit }));

    expect(await screen.findByRole("button", { name: copy.submitting })).toBeDisabled();
    expect(await screen.findByRole("button", { name: copy.submit })).toBeEnabled();
  });
});
