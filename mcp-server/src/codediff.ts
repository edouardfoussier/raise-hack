import { chromium } from "playwright";
import { cp, mkdtemp, mkdir, rm, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateText, Output } from "ai";
import { z } from "zod";
import { selectModel } from "./vlm.js";

/**
 * "Code diff as video" mode (backend / teaching track): take a file BEFORE and
 * AFTER a change, replay the diff as a typewriter animation in a code editor,
 * with LLM-narrated subtitles explaining the WHY of each hunk. Same spine as the
 * UI engine: deterministic replay + Claude, different surface.
 */

const ASSETS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets");
const PLAYER = path.join(ASSETS, "codediff-player.html");

export interface Hunk {
  beforeStart: number; // 0-based line index into the BEFORE file
  del: string[];
  add: string[];
}

/** Line-level LCS diff → ordered hunks (runs of removed/added lines). */
export function lineDiff(beforeSrc: string, afterSrc: string): { before: string[]; hunks: Hunk[] } {
  const A = beforeSrc.replace(/\n$/, "").split("\n");
  const B = afterSrc.replace(/\n$/, "").split("\n");
  const n = A.length, m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const ops: { t: "eq" | "del" | "add"; text: string }[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { ops.push({ t: "eq", text: A[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: "del", text: A[i] }); i++; }
    else { ops.push({ t: "add", text: B[j] }); j++; }
  }
  while (i < n) ops.push({ t: "del", text: A[i++] });
  while (j < m) ops.push({ t: "add", text: B[j++] });

  const hunks: Hunk[] = [];
  let beforeIdx = 0, k = 0;
  while (k < ops.length) {
    if (ops[k].t === "eq") { beforeIdx++; k++; continue; }
    const beforeStart = beforeIdx;
    const del: string[] = [], add: string[] = [];
    while (k < ops.length && ops[k].t !== "eq") {
      if (ops[k].t === "del") { del.push(ops[k].text); beforeIdx++; }
      else add.push(ops[k].text);
      k++;
    }
    hunks.push({ beforeStart, del, add });
  }
  return { before: A, hunks };
}

const NarrationSchema = z.object({
  title: z.string().describe("A short human title for the whole change (max ~8 words)."),
  hunks: z.array(
    z.object({
      index: z.number().describe("The hunk number this explanation is for."),
      why: z.string().describe("ONE concise sentence on WHY this change was made (intent / bug fixed / improvement)."),
    }),
  ),
});
export type Narration = z.infer<typeof NarrationSchema>;

/** Ask Claude for the WHY of each hunk + an overall title. */
export async function narrateHunks(params: {
  before: string;
  after: string;
  hunks: Hunk[];
  filename: string;
  language?: string; // subtitle language, e.g. "fr" | "en"
}): Promise<Narration> {
  const lang = params.language === "en" ? "English" : "French";
  const hunksText = params.hunks
    .map(
      (h, idx) =>
        `HUNK #${idx} (around line ${h.beforeStart + 1}):\n` +
        (h.del.length ? h.del.map((l) => "-" + l).join("\n") : "(nothing removed)") +
        "\n" +
        (h.add.length ? h.add.map((l) => "+" + l).join("\n") : "(nothing added)"),
    )
    .join("\n\n");

  const { output } = await generateText({
    model: selectModel(),
    system:
      `You are a senior engineer explaining a code change to a junior, like a great code review. ` +
      `For EACH numbered hunk, write ONE concise sentence (max ~14 words) on WHY the change was made — the intent, the bug it fixes, or the improvement — not a literal restatement of the diff. ` +
      `Be specific and pedagogical. Also give a short overall title. Write everything in ${lang}.`,
    output: Output.object({ schema: NarrationSchema }),
    prompt:
      `File: ${params.filename}\n\n=== BEFORE ===\n${params.before}\n\n=== AFTER ===\n${params.after}\n\n` +
      `=== HUNKS (explain each by index) ===\n${hunksText}`,
  });
  return output as Narration;
}

export interface CodeDiffScenario {
  filename: string;
  lang: string;
  before: string[];
  title: string;
  hunks: (Hunk & { why: string })[];
}

/** Full pipeline: diff → narrate → animate in the player → record a webm. */
export async function renderCodeDiffVideo(params: {
  before: string;
  after: string;
  filename: string;
  lang?: string;
  outWebm: string;
  narrationLang?: string;
  viewport?: { width: number; height: number };
}): Promise<{ webm: string; scenario: CodeDiffScenario; narration: Narration }> {
  const { before: beforeLines, hunks } = lineDiff(params.before, params.after);
  if (hunks.length === 0) throw new Error("codediff: no differences between BEFORE and AFTER.");

  const narration = await narrateHunks({
    before: params.before,
    after: params.after,
    hunks,
    filename: params.filename,
    language: params.narrationLang,
  });
  const byIdx = new Map(narration.hunks.map((h) => [h.index, h.why]));
  const scenario: CodeDiffScenario = {
    filename: params.filename,
    lang: params.lang ?? "javascript",
    before: beforeLines,
    title: narration.title,
    hunks: hunks.map((h, idx) => ({ ...h, why: byIdx.get(idx) ?? "" })),
  };

  const vp = params.viewport ?? { width: 960, height: 660 };
  const videoDir = await mkdtemp(path.join(tmpdir(), "scenario-code-"));
  await mkdir(path.dirname(params.outWebm), { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: vp, recordVideo: { dir: videoDir, size: vp } });
    await context.addInitScript(`window.SCENARIO = ${JSON.stringify(scenario)};`);
    const page = await context.newPage();
    await page.goto("file://" + PLAYER, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await page.evaluate(() => (window as unknown as { playScenario: () => Promise<void> }).playScenario());
    await page.waitForTimeout(500);
    const video = page.video();
    await context.close();
    if (video) {
      const src = await video.path();
      await rename(src, params.outWebm).catch(async () => { await cp(src, params.outWebm); });
    }
  } finally {
    await browser.close();
    await rm(videoDir, { recursive: true, force: true });
  }
  return { webm: params.outWebm, scenario, narration };
}
