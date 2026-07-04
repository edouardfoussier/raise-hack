/**
 * Harness to exercise the ANIMATION-aware pipeline WITHOUT Cursor.
 * Crafts a motion drift (sluggish, off-token transition), captures before/after
 * interaction frames, and asks the VLM for a motion verdict.
 *   npx tsx src/cli-motion.ts
 */
import "./env.js";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { captureInteractionFrames } from "./capture.js";
import { getMotionVerdict } from "./vlm.js";

const appDir = path.resolve(process.cwd(), "../sample-app");
const cssPath = path.join(appDir, "components.css");
const clean = await readFile(cssPath, "utf8");

// Craft a motion regression: token-based fast transition → sluggish, linear, over-broad `all`,
// and an exaggerated hover lift.
const drifted = clean
  .replace(/transition:[\s\S]*?;/, "transition: all 450ms linear;")
  .replace(
    "transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);",
    "transform: translateY(-6px);\n  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.45);",
  );

if (drifted === clean) {
  console.error("⚠️  drift injection did not match — check components.css structure");
  process.exit(1);
}

const outDir = path.resolve(process.cwd(), "..", ".drift-cache", "motion");
const common = {
  appDir,
  previewRel: "preview.html",
  changedRelToApp: "components.css",
  frameSelector: "#stage",
  targetSelector: "#demo-button",
  interaction: "hover" as const,
  outDir,
};

console.log("⧗ capturing before/after interaction frames…");
const browser = await chromium.launch();
let before, after;
try {
  before = await captureInteractionFrames(browser, { ...common, content: clean, label: "before" });
  after = await captureInteractionFrames(browser, { ...common, content: drifted, label: "after" });
} finally {
  await browser.close();
}
console.log(`  before: ${before.framePaths.length} frames · after: ${after.framePaths.length} frames → ${outDir}`);

const tokensJson = await readFile(path.join(appDir, "tokens.json"), "utf8");
const diff = [
  "  .btn {",
  "-   transition: background/transform/box-shadow var(--motion-fast) var(--ease-standard);",
  "+   transition: all 450ms linear;",
  "  }",
  "  .btn--primary:hover {",
  "-   transform: translateY(-1px);",
  "+   transform: translateY(-6px);",
  "  }",
].join("\n");

console.log("⧗ asking the VLM for a motion verdict…");
const verdict = await getMotionVerdict({
  beforeFramePaths: before.framePaths,
  afterFramePaths: after.framePaths,
  tokensJson,
  diff,
  filePath: "sample-app/components.css",
  interaction: "hover",
});

console.log(`\n${verdict.classification} · confidence ${(verdict.confidence * 100).toFixed(0)}%`);
console.log(`\n${verdict.reasoning}`);
if (verdict.proposed_diff.trim()) console.log(`\nProposed fix:\n${verdict.proposed_diff}`);
