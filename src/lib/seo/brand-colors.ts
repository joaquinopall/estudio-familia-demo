/**
 * Design tokens needed outside CSS (the OG image is rendered by next/og, which cannot read CSS
 * variables). Must match :root in src/app/globals.css; a test enforces it.
 */
export const brandColors = {
  background: "#faf7f2",
  foreground: "#2b2a28",
  primary: "#1f5c5b",
  primaryForeground: "#ffffff",
  secondary: "#efe8dd",
  mutedForeground: "#5f5a52",
  accent: "#b4532f",
} as const;
