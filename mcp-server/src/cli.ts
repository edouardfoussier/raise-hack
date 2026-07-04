/**
 * Standalone harness to exercise the full Drift pipeline WITHOUT Cursor.
 *   npm run review -- ../sample-app/components.css "#demo-button"
 */
import "./env.js";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { getRepoRoot, getHeadContent, getWorkingContent, getDiff, toRepoRel } from "./git.js";
import { renderBeforeAfter } from "./render.js";
import { getVerdict } from "./vlm.js";

const arg = process.argv[2] ?? path.resolve(process.cwd(), "../sample-app/components.css");
const selector = process.argv[3] ?? "#demo-button";

const absPath = path.resolve(arg);
const repoRoot = await getRepoRoot(absPath);
const repoRel = toRepoRel(repoRoot, absPath);
const appDir = path.dirname(absPath); // MVP: changed file lives in the app dir
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
console.log(`  before: ${r.beforePngPath}`);
console.log(`  after : ${r.afterPngPath}`);

if (!diff) {
  console.log("\n✓ No change vs HEAD — nothing to review.");
  process.exit(0);
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

const icon: Record<string, string> = {
  intentional_redesign: "✎ intentional redesign",
  accidental_regression: "✗ accidental regression",
  platform_constraint: "⚙ platform constraint",
};
console.log(`\n${icon[verdict.classification] ?? verdict.classification}  ·  confidence ${(verdict.confidence * 100).toFixed(0)}%`);
console.log(`\n${verdict.reasoning}`);
if (verdict.proposed_diff.trim()) {
  console.log(`\nProposed fix:\n${verdict.proposed_diff}`);
}
