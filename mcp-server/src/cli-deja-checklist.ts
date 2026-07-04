/**
 * Drift on the REAL deja-bu reception CHECKLIST flow (mobile, read-only).
 * Simulates a PR that removes the `touch-target` accessibility class from the
 * checklist action buttons, and reviews the before/after flow.
 *   npx tsx src/cli-deja-checklist.ts
 * Requires the deja-bu dev server at http://localhost:5173.
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
const TARGET = "app/src/lib/reception/checklist/ChecklistLineCard.svelte";
const TARGET_ABS = path.join(DEJA, TARGET);
const OUT = path.resolve(process.cwd(), "..", ".drift-cache", "deja-checklist");
const URL = "http://localhost:5173/";
const PWD = process.env.DEJA_PWD || ""; // real deja-bu password — set via env, never commit it

const STEPS: FlowStep[] = [
  { action: "wait", ms: 1600 },
  { action: "click", selector: 'button:has-text("Reprendre")' }, // 👆 resume → checklist
  { action: "wait", ms: 2600 },
  { action: "hover", selector: 'button:has-text("Valider")', dwell: 1500 }, // ← the drift target (before/after), touch pointer on it
  { action: "hover", selector: 'button:has-text("Rien reçu")', dwell: 600 },
  { action: "click", selector: 'button:has-text("Corriger")' }, // reveal the correction UI
  { action: "wait", ms: 700 },
  { action: "type", selector: "textarea", text: "1 carton abîmé" }, // ⌨ iOS keyboard + key presses
  { action: "wait", ms: 1800 },
  { action: "wait", ms: 400 },
];
const initScript = `try{localStorage.setItem('deja-bu:v1:auth-token', JSON.stringify(${JSON.stringify(PWD)}));}catch(e){}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function record(label: string): Promise<string> {
  return recordLiveFlow({
    url: URL,
    steps: STEPS,
    outWebm: path.join(OUT, `${label}.webm`),
    device: "iPhone 13",
    readOnly: true,
    initScript,
    pointer: "touch", // 👆 mobile tap indicator instead of a desktop arrow
    keyboard: true, // ⌨ synthetic iOS keyboard on text-field focus
  });
}
async function frames(webm: string, dir: string, fps = 0.9): Promise<string[]> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await pexec(`ffmpeg -y -i "${webm}" -vf "fps=${fps}" "${path.join(dir, "f-%03d.png")}"`);
  return (await readdir(dir)).filter((f) => f.endsWith(".png")).sort().map((f) => path.join(dir, f));
}
const CLEAN = "col-span-3 rounded-xl bg-brand py-3";
const DRIFT = "col-span-3 rounded-sm bg-[#a855f7] py-2";
async function applyDrift(): Promise<void> {
  const src = await readFile(TARGET_ABS, "utf8");
  const out = src.replace(CLEAN, DRIFT);
  if (out === src) throw new Error("drift target (Valider button class) not found — file changed?");
  await writeFile(TARGET_ABS, out, "utf8");
}
async function revert(): Promise<void> {
  await pexec(`git -C "${DEJA}" checkout -- "${TARGET}"`);
}

await revert();
await sleep(1500);
console.log("⧗ recording BEFORE (HEAD — touch-target present)…");
await record("before");

console.log("⧗ applying regression (remove touch-target) + recording AFTER…");
await applyDrift();
await sleep(2200);
await record("after");
await revert();

console.log("⧗ extracting frames + VLM verdict…");
const bf = await frames(path.join(OUT, "before.webm"), path.join(OUT, "bf"));
const af = await frames(path.join(OUT, "after.webm"), path.join(OUT, "af"));

const designSystem = JSON.stringify(
  {
    framework: "Tailwind CSS — dark, mobile-first PWA used on the shop floor",
    brand: { DEFAULT: "#14b8a6", note: "teal scale; primary actions use bg-brand" },
    neutrals: "Tailwind slate scale",
    conventions: {
      primary:
        "primary CTAs use `bg-brand` (teal #14b8a6) with `rounded-xl`; the ✅ Valider button is the main confirm action on each checklist line card.",
      radius: "rounded-xl on primary buttons/cards, rounded-lg on secondary",
      color: "every color must come from the brand (teal) or slate palette — no hardcoded hex outside it.",
    },
  },
  null,
  2,
);
const diff = [
  "  ChecklistLineCard.svelte — primary action button (✅ Valider)",
  '-   class="touch-target col-span-3 rounded-xl bg-brand py-3 …"',
  '+   class="touch-target col-span-3 rounded-sm bg-[#a855f7] py-2 …"',
].join("\n");

const verdict = await getMotionVerdict({
  beforeFramePaths: bf,
  afterFramePaths: af,
  tokensJson: designSystem,
  diff,
  filePath: "app/src/lib/reception/checklist/ChecklistLineCard.svelte",
  interaction: "réception checklist flow (real deja-bu app, iPhone)",
});

const toVideo = async (p: string): Promise<Visual> => ({
  kind: "video",
  dataUri: `data:video/webm;base64,${(await readFile(p)).toString("base64")}`,
});
const html = buildReportHtml({
  verdict,
  filePath: "deja-bu · ChecklistLineCard.svelte · réception (mobile)",
  model: process.env.DRIFT_VLM_MODEL || "claude-sonnet-5",
  interaction: "flow",
  before: await toVideo(path.join(OUT, "before.webm")),
  after: await toVideo(path.join(OUT, "after.webm")),
});
const reportPath = path.join(OUT, "deja-checklist-report.html");
await writeAndOpenReport(html, reportPath, process.env.DRIFT_OPEN !== "0");

console.log(`\n${verdict.classification} · confidence ${(verdict.confidence * 100).toFixed(0)}%`);
console.log(`\n${verdict.reasoning}`);
console.log(`\n✓ report: ${reportPath}`);
