import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Verifies WCAG 2.2 AA contrast for the design tokens in globals.css (SPEC §11.1, NFR-A11Y-01).
 * Text needs 4.5:1; focus rings and form-field boundaries need 3:1 (non-text contrast).
 */

function readRootTokens(): Map<string, string> {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const root = /:root\s*\{([\s\S]*?)\}/.exec(css)?.[1] ?? "";
  const tokens = new Map<string, string>();
  for (const match of root.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) tokens.set(name, value.trim());
  }
  return tokens;
}

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`expected a 6-digit hex color, got "${hex}"`);
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

const tokens = readRootTokens();
const token = (name: string): string => {
  const value = tokens.get(name);
  if (!value) throw new Error(`token --${name} not found in :root`);
  return value;
};

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});

describe("design tokens contrast (WCAG AA)", () => {
  const textPairs: [string, string][] = [
    ["foreground", "background"],
    ["foreground", "card"],
    ["primary-foreground", "primary"],
    ["accent-foreground", "accent"],
    ["secondary-foreground", "secondary"],
    ["muted-foreground", "background"],
    ["muted-foreground", "muted"],
    ["primary", "background"],
    ["accent", "background"],
    ["destructive", "background"],
  ];

  it.each(textPairs)("--%s on --%s is at least 4.5:1", (text, surface) => {
    expect(contrastRatio(token(text), token(surface))).toBeGreaterThanOrEqual(4.5);
  });

  const nonTextPairs: [string, string][] = [
    ["ring", "background"],
    ["input", "background"],
    ["input", "card"],
  ];

  it.each(nonTextPairs)("--%s on --%s is at least 3:1", (element, surface) => {
    expect(contrastRatio(token(element), token(surface))).toBeGreaterThanOrEqual(3);
  });
});
