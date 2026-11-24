/**
 * Inline styles shared by the inquiry emails. Email clients ignore most CSS, so styles are
 * inline and simple. Colors come from the design tokens (lib/seo/brand-colors.ts, tested
 * against globals.css); system fonts, since webfonts are not reliable in email.
 */
import type { CSSProperties } from "react";

import { brandColors } from "@/lib/seo/brand-colors";

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const emailStyles = {
  body: { backgroundColor: brandColors.background, fontFamily, margin: 0, padding: "24px 0" },
  container: {
    backgroundColor: "#ffffff",
    border: `1px solid ${brandColors.secondary}`,
    borderRadius: "8px",
    margin: "0 auto",
    maxWidth: "560px",
    padding: "32px",
  },
  heading: {
    color: brandColors.foreground,
    fontSize: "22px",
    lineHeight: "1.3",
    margin: "0 0 16px",
  },
  text: { color: brandColors.foreground, fontSize: "16px", lineHeight: "1.6", margin: "0 0 16px" },
  muted: {
    color: brandColors.mutedForeground,
    fontSize: "14px",
    lineHeight: "1.6",
    margin: "0 0 16px",
  },
  alert: {
    backgroundColor: brandColors.secondary,
    borderLeft: `4px solid ${brandColors.accent}`,
    borderRadius: "4px",
    margin: "0 0 24px",
    padding: "16px",
  },
  safe: {
    backgroundColor: brandColors.secondary,
    borderLeft: `4px solid ${brandColors.primary}`,
    borderRadius: "4px",
    margin: "0 0 24px",
    padding: "16px",
  },
  alertTitle: {
    color: brandColors.foreground,
    fontSize: "18px",
    fontWeight: 700,
    margin: "0 0 8px",
  },
  label: {
    color: brandColors.mutedForeground,
    fontSize: "14px",
    padding: "6px 12px 6px 0",
    verticalAlign: "top",
    width: "45%",
  },
  value: { color: brandColors.foreground, fontSize: "15px", fontWeight: 600, padding: "6px 0" },
  reference: {
    color: brandColors.primary,
    fontSize: "24px",
    fontWeight: 700,
    letterSpacing: "1px",
    margin: "0 0 8px",
  },
  button: {
    backgroundColor: brandColors.primary,
    borderRadius: "6px",
    color: brandColors.primaryForeground,
    display: "inline-block",
    fontSize: "16px",
    fontWeight: 600,
    padding: "12px 20px",
    textDecoration: "none",
  },
} as const satisfies Record<string, CSSProperties>;
