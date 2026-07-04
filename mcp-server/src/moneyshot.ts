/**
 * Money-shot helper: runs the SAME static before/after design-drift review as cli.ts,
 * then builds the self-contained report HTML (report.ts) and screenshots it to a
 * clean high-res PNG via Playwright. Does NOT modify cli.ts/render.ts/vlm.ts/report.ts.
 *
 *   npm run moneyshot            # uses ../sample-app/components.css, #demo-button
 *   npm run moneyshot -- <cssPath> <selector>
 */
import "./env.js";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { getRepoRoot, getHeadContent, getWorkingContent, getDiff, toRepoRel } from "./git.js";
import { renderBeforeAfter } from "./render.js";
import { getVerdict, selectModel } from "./vlm.js";
import { buildReportHtml } from "./report.js";

const arg = process.argv[2] ?? path.resolve(process.cwd(), "../sample-app/components.css");
const selector = process.argv[3] ?? "#demo-button";

const absPath = path.resolve(arg);
const repoRoot = await getRepoRoot(absPath);
const repoRel = toRepoRel(repoRoot, absPath);
const appDir = path.dirname(absPath);
const previewRel = "preview.html";
const changedRelToApp = path.basename(absPath);

const beforeContent = await getHeadContent(repoRoot, repoRel);
const afterContent = await getWorkingContent(absPath);
const diff = await getDiff(repoRoot, repoRel);
const outDir = path.resolve(repoRoot, ".drift-cache");

console.log("⧗ rendering before/after…");
const r = await renderBeforeAfter({
  appDir, previewRel, changedRelToApp, beforeContent, afterContent, selector, outDir,
});

if (!diff) {
  console.log("\n✓ No change vs HEAD — nothing to review.");
  process.exit(1);
}

console.log("⧗ asking the VLM for a verdict…");
const tokensJson = await readFile(path.resolve(appDir, "tokens.json"), "utf8");
const verdict = await getVerdict({
  beforePngPath: r.beforePngPath,
  afterPngPath: r.afterPngPath,
  tokensJson,
  diff,
  filePath: repoRel,
});

// Resolve a display model id the same way vlm.ts selects one.
const modelId =
  (process.env.DRIFT_VLM_MODEL?.trim() || "claude-sonnet-5").replace(/^anthropic\//, "");

// Print the verdict as JSON so the caller can quote it verbatim.
console.log("\n===VERDICT_JSON_START===");
console.log(JSON.stringify(verdict, null, 2));
console.log("===VERDICT_JSON_END===");

// Build the self-contained report HTML with the existing report.ts builder.
const html = buildReportHtml({
  verdict,
  filePath: repoRel,
  model: modelId,
  before: { kind: "image", dataUri: `data:image/png;base64,${r.beforePngBase64}` },
  after: { kind: "image", dataUri: `data:image/png;base64,${r.afterPngBase64}` },
});

const moneyDir = path.resolve(outDir, "moneyshot");
await mkdir(moneyDir, { recursive: true });
const htmlPath = path.resolve(moneyDir, "review-report.html");
const pngPath = path.resolve(moneyDir, "review-report.png");
await writeFile(htmlPath, html, "utf8");

// Screenshot the report to a clean high-res full-page PNG.
console.log("⧗ rendering report → PNG…");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto("file://" + htmlPath, { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  await page.screenshot({ path: pngPath, fullPage: true });
} finally {
  await browser.close();
}

console.log(`\n✓ report html : ${htmlPath}`);
console.log(`✓ report png  : ${pngPath}`);
