/**
 * `npm run lighthouse` (F5-03, SPEC §1, MT-12): Lighthouse mobile on every public page, against
 * a server that is already running (`npm run build && npm run start`). No dependency: it runs
 * `npx lighthouse@<pinned>`, with the Chromium Playwright already installed.
 *
 * Three runs per page and the median, because one run varies a lot (more on Windows). Fails
 * (exit 1) when a category is under 90. With the demo mode on, the site is `noindex` on
 * purpose (ADR-0010), so SEO is only checked with --seo, on a build with
 * NEXT_PUBLIC_DEMO_MODE=false; without --seo it only checks that "is-crawlable" is the one
 * SEO audit that fails.
 *
 *   npm run lighthouse                      # http://localhost:3000, 3 runs
 *   npm run lighthouse -- --seo             # build without demo mode
 *   npm run lighthouse -- --runs 5 --base http://localhost:3100
 *
 * Measure with nothing else running (no `npm run dev`): the CPU is shared.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "@playwright/test";

import { getPublicPaths } from "../src/lib/seo/routes";

const LIGHTHOUSE = "lighthouse@13.6.0";
const THRESHOLD = 90;
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"] as const;
type Category = (typeof CATEGORIES)[number];

type Options = { base: string; runs: number; seo: boolean };

function parseArgs(argv: string[]): Options {
  const options: Options = { base: "http://localhost:3000", runs: 3, seo: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--seo") options.seo = true;
    else if (arg === "--base") options.base = argv[++i] ?? "";
    else if (arg === "--runs") options.runs = Number(argv[++i]);
    else throw new Error(`Argumento desconocido: ${arg}`);
  }
  // Only a plain http(s) origin: it ends up in a shell command line.
  const url = new URL(options.base);
  if (!/^https?:$/.test(url.protocol) || url.pathname !== "/" || url.search) {
    throw new Error("--base tiene que ser un origen http(s), como http://localhost:3000");
  }
  options.base = url.origin;
  if (!Number.isInteger(options.runs) || options.runs < 1 || options.runs > 9) {
    throw new Error("--runs tiene que ser un número entero entre 1 y 9");
  }
  return options;
}

type Report = {
  categories: Record<Category, { score: number | null }>;
  audits: Record<string, { score: number | null; scoreDisplayMode: string; displayValue?: string }>;
};

function runLighthouse(url: string, outputPath: string): Report {
  const chromePath = chromium.executablePath();
  // shell: npx is a .cmd on Windows. Every argument is fixed or a validated URL.
  execFileSync(
    "npx",
    [
      "-y",
      LIGHTHOUSE,
      `"${url}"`,
      "--output=json",
      `--output-path="${outputPath}"`,
      "--quiet",
      "--no-enable-error-reporting",
      '--chrome-flags="--headless=new"',
    ],
    { env: { ...process.env, CHROME_PATH: chromePath }, stdio: "ignore", shell: true },
  );
  return JSON.parse(readFileSync(outputPath, "utf8")) as Report;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/** SEO audits that fail in a report; in demo mode only "is-crawlable" may (noindex). */
const failingSeoAudits = (report: Report) =>
  [
    "is-crawlable",
    "document-title",
    "meta-description",
    "http-status-code",
    "link-text",
    "crawlable-anchors",
    "robots-txt",
    "hreflang",
    "canonical",
    "image-alt",
  ].filter((id) => report.audits[id]?.score === 0);

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));
  try {
    await fetch(options.base);
  } catch {
    console.error(`No responde ${options.base}. Levantá antes: npm run build && npm run start`);
    return 1;
  }

  const outDir = mkdtempSync(join(tmpdir(), "lighthouse-"));
  const checked: Category[] = options.seo
    ? [...CATEGORIES]
    : ["performance", "accessibility", "best-practices"];
  const problems: string[] = [];
  console.info(
    `Lighthouse ${LIGHTHOUSE.split("@")[1]} mobile, ${options.runs} corridas por página (mediana), ${options.base}`,
  );
  console.info(`Página | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT`);

  try {
    for (const path of getPublicPaths()) {
      const reports: Report[] = [];
      for (let run = 0; run < options.runs; run++) {
        reports.push(runLighthouse(`${options.base}${path}`, join(outDir, `${run}.json`)));
      }
      const scores = Object.fromEntries(
        CATEGORIES.map((category) => [
          category,
          median(reports.map((r) => Math.round((r.categories[category].score ?? 0) * 100))),
        ]),
      ) as Record<Category, number>;
      // LCP, CLS and TBT of the run whose Performance is the median one, so they match it.
      const medianRun =
        reports.find(
          (r) => Math.round((r.categories.performance.score ?? 0) * 100) === scores.performance,
        ) ?? reports[0];
      const pick = (id: string) => medianRun?.audits[id]?.displayValue ?? "?";
      console.info(
        [
          path,
          ...CATEGORIES.map((c) => scores[c]),
          pick("largest-contentful-paint"),
          pick("cumulative-layout-shift"),
          pick("total-blocking-time"),
        ].join(" | "),
      );

      for (const category of checked) {
        if (scores[category] < THRESHOLD) problems.push(`${path}: ${category} ${scores[category]}`);
      }
      if (!options.seo) {
        const unexpected = failingSeoAudits(reports[0] as Report).filter(
          (id) => id !== "is-crawlable",
        );
        if (unexpected.length > 0)
          problems.push(`${path}: SEO falla además en ${unexpected.join(", ")}`);
      }
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }

  if (!options.seo) {
    console.info(
      "SEO no se exige: con el modo demo el sitio es noindex (ADR-0010). Para medirlo: build con NEXT_PUBLIC_DEMO_MODE=false y --seo.",
    );
  }
  if (problems.length > 0) {
    console.error(`\nDebajo de ${THRESHOLD}:\n  ${problems.join("\n  ")}`);
    return 1;
  }
  console.info(`\nTodas las páginas ≥ ${THRESHOLD}.`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  },
);
