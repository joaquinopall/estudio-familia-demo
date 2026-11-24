/**
 * Turns the email templates into the { html, text } the EmailSender port expects. Always both:
 * some clients and screen readers only show the plain text.
 */
import { render, toPlainText } from "@react-email/render";
import type { ReactElement } from "react";

export async function renderEmail(element: ReactElement): Promise<{ html: string; text: string }> {
  const html = await render(element);
  return { html, text: toPlainText(html) };
}
