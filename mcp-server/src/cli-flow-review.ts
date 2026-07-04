/**
 * Record the onboarding FLOW before (HEAD) vs after (working tree), extract frames,
 * get a VLM verdict on the flow drift, and open a side-by-side visual report.
 *   npx tsx src/cli-flow-review.ts
 */
import "./env.js";
import path from "node:path";
import { readFile, readdir, mkdir, rm } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getRepoRoot, getHeadContent, getWorkingContent, getDiff, toRepoRel } from "./git.js";
import { recordFlow, type FlowStep } from "./flow.js";
import { getMotionVerdict } from "./vlm.js";
import { buildReportHtml, writeAndOpenReport, type Visual } from "./report.js";

const pexec = promisify(exec);

async function extractFrames(webm: string, dir: string, fps = 0.7): Promise<string[]> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await pexec(`ffmpeg -y -i "${webm}" -vf "fps=${fps}" "${path.join(dir, "f-%03d.png")}"`);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".png")).sort();
  return files.map((f) => path.join(dir, f));
}

const toVideo = async (webm: string): Promise<Visual> => ({
  kind: "video",
  dataUri: `data:video/webm;base64,${(await readFile(webm)).toString("base64")}`,
});

const appDir = path.resolve(process.cwd(), "../sample-app");
const cssAbs = path.join(appDir, "components.css");
const repoRoot = await getRepoRoot(cssAbs);
const cssRel = toRepoRel(repoRoot, cssAbs);
const outDir = path.resolve(repoRoot, ".drift-cache", "flow");

const beforeCss = await getHeadContent(repoRoot, cssRel);
const afterCss = await getWorkingContent(cssAbs);
const diff = await getDiff(repoRoot, cssRel);
if (!diff) {
  console.log("No change vs HEAD — apply a drift to sample-app/components.css first.");
  process.exit(0);
}

const steps: FlowStep[] = [
  { action: "hover", selector: "#flow-start", dwell: 650 },
  { action: "click", selector: "#flow-start" },
  { action: "wait", ms: 550 },
  { action: "type", selector: "#flow-name", text: "Ada Lovelace" },
  { action: "type", selector: "#flow-email", text: "ada@example.com" },
  { action: "hover", selector: "#flow-continue", dwell: 350 },
  { action: "click", selector: "#flow-continue" },
  { action: "wait", ms: 800 },
];
const common = {
  appDir,
  previewRel: "flow.html",
  changedRelToApp: "components.css",
  viewport: { width: 760, height: 560 },
  steps,
};

console.log("⧗ recording BEFORE flow (HEAD)…");
const beforeWebm = await recordFlow({ ...common, content: beforeCss, outWebm: path.join(outDir, "before.webm") });
console.log("⧗ recording AFTER flow (working tree)…");
const afterWebm = await recordFlow({ ...common, content: afterCss, outWebm: path.join(outDir, "after.webm") });

console.log("⧗ extracting frames + asking the VLM for a flow verdict…");
const beforeFrames = await extractFrames(beforeWebm, path.join(outDir, "bf"));
const afterFrames = await extractFrames(afterWebm, path.join(outDir, "af"));
const tokensJson = await readFile(path.join(appDir, "tokens.json"), "utf8");
const verdict = await getMotionVerdict({
  beforeFramePaths: beforeFrames,
  afterFramePaths: afterFrames,
  tokensJson,
  diff,
  filePath: cssRel,
  interaction: "onboarding user flow",
});

const html = buildReportHtml({
  verdict,
  filePath: cssRel,
  model: process.env.DRIFT_VLM_MODEL || "claude-sonnet-5",
  interaction: "flow",
  before: await toVideo(beforeWebm),
  after: await toVideo(afterWebm),
});
const reportPath = path.join(outDir, "flow-report.html");
await writeAndOpenReport(html, reportPath, process.env.DRIFT_OPEN !== "0");

console.log(`\n${verdict.classification} · confidence ${(verdict.confidence * 100).toFixed(0)}%`);
console.log(`\n${verdict.reasoning}`);
console.log(`\n✓ report: ${reportPath}`);
