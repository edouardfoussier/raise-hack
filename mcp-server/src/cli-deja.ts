/**
 * Drift on a REAL app (deja-bu). One run: records a mini reception flow with a
 * cursor before vs after a representative design edit to the supplier input,
 * then a VLM verdict vs the app's real Tailwind design system + a report.
 *   npx tsx src/cli-deja.ts
 * Requires the deja-bu dev server running at http://localhost:5173.
 */
import "./env.js";
import path from "node:path";
import { readFile, writeFile, readdir, mkdir, rm } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { recordLiveFlow, type FlowStep } from "./flow.js";
import { getMotionVerdict } from "./vlm.js";
import { buildReportHtml, writeAndOpenReport, type Visual } from "./report.js";

const pexec = promisify(exec);
const DEJA =
  process.env.DEJA_ROOT ||
  "/private/tmp/claude-501/-Users-edouardfoussier-code-hackathons-raise-hack/f4e261e1-af50-4307-8b66-075802a75c27/scratchpad/deja-bu";
const TARGET = "app/src/lib/reception/checklist/ChecklistStart.svelte";
const TARGET_ABS = path.join(DEJA, TARGET);
const OUT = path.resolve(process.cwd(), "..", ".drift-cache", "deja");
const URL = "http://localhost:5173/";

const CLEAN_CLASS = "w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-base";
const DRIFT_CLASS = "w-full rounded-sm border-2 border-[#a855f7] bg-slate-900 px-3 py-2 text-base";

const STEPS: FlowStep[] = [
  { action: "hover", selector: 'button:has-text("Photographier")', dwell: 600 },
  { action: "hover", selector: "#cl-supplier", dwell: 350 },
  { action: "type", selector: "#cl-supplier", text: "SAS L'Arjolle" },
  { action: "wait", ms: 800 },
];
const initScript = "try{localStorage.setItem('deja-bu:v1:auth-token', JSON.stringify('demo'));}catch(e){}";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function record(label: string): Promise<string> {
  return recordLiveFlow({
    url: URL,
    steps: STEPS,
    outWebm: path.join(OUT, `${label}.webm`),
    viewport: { width: 400, height: 860 },
    initScript,
    blockApi: true,
  });
}
async function extractFrames(webm: string, dir: string, fps = 0.9): Promise<string[]> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await pexec(`ffmpeg -y -i "${webm}" -vf "fps=${fps}" "${path.join(dir, "f-%03d.png")}"`);
  return (await readdir(dir)).filter((f) => f.endsWith(".png")).sort().map((f) => path.join(dir, f));
}
async function applyDrift(): Promise<void> {
  const src = await readFile(TARGET_ABS, "utf8");
  const out = src
    .split("\n")
    .map((l) => (l.includes('id="cl-supplier"') ? l.replace(CLEAN_CLASS, DRIFT_CLASS) : l))
    .join("\n");
  if (out === src) throw new Error("drift injection did not match — supplier input class changed?");
  await writeFile(TARGET_ABS, out, "utf8");
}
async function revert(): Promise<void> {
  await pexec(`git -C "${DEJA}" checkout -- "${TARGET}"`);
}

await revert();
await sleep(1500);
console.log("⧗ recording BEFORE (clean state)…");
await record("before");

console.log("⧗ applying representative drift + recording AFTER…");
await applyDrift();
await sleep(2200); // let Vite HMR recompile
await record("after");
await revert();

console.log("⧗ extracting frames + asking the VLM (vs the real Tailwind design system)…");
const bf = await extractFrames(path.join(OUT, "before.webm"), path.join(OUT, "bf"));
const af = await extractFrames(path.join(OUT, "after.webm"), path.join(OUT, "af"));

const designSystem = JSON.stringify(
  {
    framework: "Tailwind CSS (dark theme)",
    brand: { DEFAULT: "#14b8a6", note: "teal scale 50–900 (#f0fdfa … #134e4a)" },
    neutrals: "Tailwind slate scale (slate-300/400/800/900) for text, borders, surfaces",
    conventions: {
      inputs: "rounded-xl · border border-slate-800 · bg-slate-900 · px-4 py-3 · text-base",
      radius: "rounded-xl on inputs & cards; primary buttons use bg-brand (teal)",
      accent: "brand teal; required-field marks use text-red-400",
    },
  },
  null,
  2,
);
const diff = [
  '  <input id="cl-supplier" … />   (Réception — supplier field, ChecklistStart.svelte)',
  `-   class="${CLEAN_CLASS}"`,
  `+   class="${DRIFT_CLASS}"`,
].join("\n");

const verdict = await getMotionVerdict({
  beforeFramePaths: bf,
  afterFramePaths: af,
  tokensJson: designSystem,
  diff,
  filePath: "app/src/lib/reception/checklist/ChecklistStart.svelte",
  interaction: "réception flow (real deja-bu app)",
});

const toVideo = async (p: string): Promise<Visual> => ({
  kind: "video",
  dataUri: `data:video/webm;base64,${(await readFile(p)).toString("base64")}`,
});
const html = buildReportHtml({
  verdict,
  filePath: "deja-bu · ChecklistStart.svelte (#cl-supplier)",
  model: process.env.DRIFT_VLM_MODEL || "claude-sonnet-5",
  interaction: "flow",
  before: await toVideo(path.join(OUT, "before.webm")),
  after: await toVideo(path.join(OUT, "after.webm")),
});
const reportPath = path.join(OUT, "deja-report.html");
await writeAndOpenReport(html, reportPath, process.env.DRIFT_OPEN !== "0");

console.log(`\n${verdict.classification} · confidence ${(verdict.confidence * 100).toFixed(0)}%`);
console.log(`\n${verdict.reasoning}`);
console.log(`\n✓ report: ${reportPath}`);
