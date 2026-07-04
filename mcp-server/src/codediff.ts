import { chromium } from "playwright";
import { cp, mkdtemp, mkdir, rm, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { generateText, Output } from "ai";
import { z } from "zod";
import { selectModel } from "./vlm.js";

/**
 * "Code diff as video" mode (backend / teaching track): take a file (or a whole
 * git commit spanning several files) BEFORE and AFTER a change, replay the diff
 * as a typewriter animation in a code editor, with LLM-narrated subtitles that
 * explain the WHY of each hunk — and let the LLM pick a pedagogical file order.
 * Same spine as the UI engine: deterministic replay + Claude, different surface.
 */

const pexecFile = promisify(execFile);
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

const LANG: Record<string, string> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", mjs: "javascript", cjs: "javascript",
  svelte: "svelte", vue: "vue", py: "python", go: "go", rs: "rust", java: "java", kt: "kotlin",
  rb: "ruby", php: "php", c: "c", h: "c", cpp: "cpp", cs: "csharp", css: "css", scss: "scss",
  html: "html", json: "json", yaml: "yaml", yml: "yaml", md: "markdown", sql: "sql", sh: "bash",
};
export function langOf(file: string): string {
  return LANG[file.split(".").pop()?.toLowerCase() ?? ""] ?? "text";
}

const SKIP_EXT = new Set(["lock", "png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "webm", "mp4", "pdf", "woff", "woff2", "ttf", "otf", "map", "min"]);
const SKIP_NAME = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);

export interface DiffFile {
  filename: string;
  before: string;
  after: string;
  lang?: string;
}

async function gitShow(repo: string, rev: string, file: string): Promise<string> {
  try {
    const { stdout } = await pexecFile("git", ["-C", repo, "show", `${rev}:${file}`], { maxBuffer: 20 * 1024 * 1024 });
    return stdout;
  } catch {
    return ""; // file absent at that rev (e.g. newly added → no parent version)
  }
}

/** Extract the changed code files of a git commit as before/after pairs. */
export async function filesFromGitCommit(
  repo: string,
  ref: string,
  opts: { maxFiles?: number } = {},
): Promise<DiffFile[]> {
  const max = opts.maxFiles ?? 6;
  const { stdout } = await pexecFile(
    "git",
    ["-C", repo, "diff", "--name-status", "-M", `${ref}^`, ref],
    { maxBuffer: 20 * 1024 * 1024 },
  );
  const rows = stdout.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: DiffFile[] = [];
  const skipped: string[] = [];
  for (const row of rows) {
    const parts = row.split("\t");
    const status = parts[0][0]; // M, A, D, R, C
    if (status === "D") { skipped.push(parts[1] + " (deleted)"); continue; }
    const oldPath = parts[1];
    const newPath = status === "R" || status === "C" ? parts[2] : parts[1];
    const ext = newPath.split(".").pop()?.toLowerCase() ?? "";
    const base = newPath.split("/").pop() ?? newPath;
    if (SKIP_EXT.has(ext) || SKIP_NAME.has(base)) { skipped.push(newPath); continue; }
    const before = status === "A" ? "" : await gitShow(repo, `${ref}^`, oldPath);
    const after = await gitShow(repo, ref, newPath);
    if (before === after) continue;
    out.push({ filename: newPath, before, after, lang: langOf(newPath) });
  }
  if (out.length > max) {
    console.error(`  (codediff: ${out.length} changed files, keeping the first ${max}: ${out.slice(max).map((f) => f.filename).join(", ")} dropped)`);
    out.length = max;
  }
  if (skipped.length) console.error(`  (codediff: skipped ${skipped.length} non-code/deleted: ${skipped.slice(0, 6).join(", ")}${skipped.length > 6 ? "…" : ""})`);
  return out;
}

const NarrationSchema = z.object({
  title: z.string().describe("A short human title for the whole change (max ~9 words)."),
  fileOrder: z.array(z.number()).describe("The file indices in the BEST pedagogical order to present them (core change first, then call-sites). A permutation of the given indices."),
  files: z.array(
    z.object({
      index: z.number().describe("The file index this refers to."),
      intro: z.string().describe("One short line: this file's role in the change (why we look at it)."),
      hunks: z.array(z.object({
        index: z.number().describe("The hunk number within this file."),
        why: z.string().describe("ONE concise sentence on WHY this change was made (intent / bug fixed / improvement)."),
      })),
    }),
  ),
});
export type Narration = z.infer<typeof NarrationSchema>;

/** Ask Claude for the WHY of each hunk, a per-file intro, an overall title, and a teaching order. */
export async function narrateChange(params: {
  files: { filename: string; before: string; after: string; hunks: Hunk[] }[];
  language?: string;
}): Promise<Narration> {
  const lang = params.language === "en" ? "English" : "French";
  const body = params.files
    .map((f, fi) => {
      const hunks = f.hunks
        .map((h, hi) => `  HUNK #${hi} (line ~${h.beforeStart + 1}):\n` +
          (h.del.length ? h.del.map((l) => "  -" + l).join("\n") : "  (nothing removed)") + "\n" +
          (h.add.length ? h.add.map((l) => "  +" + l).join("\n") : "  (nothing added)"))
        .join("\n");
      return `FILE #${fi}: ${f.filename}\n${hunks}`;
    })
    .join("\n\n");

  const { output } = await generateText({
    model: selectModel(),
    system:
      `You are a senior engineer explaining a code change to a junior, like a great code review. ` +
      `You get one change that may span several files. Decide the BEST order to present the files so the change is easy to understand (the core/root change first, then its call-sites/consumers). ` +
      `For EACH file give a one-line intro (its role in the change). For EACH hunk write ONE concise sentence (max ~14 words) on WHY the change was made — the intent, the bug it fixes, or the improvement — not a literal restatement of the diff. ` +
      `Also give a short overall title. Write everything in ${lang}.`,
    output: Output.object({ schema: NarrationSchema }),
    prompt: `A change across ${params.files.length} file(s). Explain it.\n\n${body}`,
  });
  return output as Narration;
}

export interface ScenarioFile {
  filename: string;
  lang: string;
  before: string[];
  intro: string;
  hunks: (Hunk & { why: string })[];
}
export interface CodeScenario {
  title: string;
  repoLabel?: string;
  narrationLang: string;
  files: ScenarioFile[];
}

function isPermutation(order: number[], n: number): boolean {
  if (order.length !== n) return false;
  const seen = new Set(order);
  return seen.size === n && order.every((x) => x >= 0 && x < n);
}

/** Full pipeline (single or multi-file): diff → narrate (+order) → animate → record a webm. */
export async function renderCodeDiff(params: {
  files: DiffFile[];
  repoLabel?: string;
  narrationLang?: string;
  outWebm: string;
  viewport?: { width: number; height: number };
}): Promise<{ webm: string; scenario: CodeScenario; narration: Narration }> {
  const prepared = params.files
    .map((f) => {
      const { before, hunks } = lineDiff(f.before, f.after);
      return { filename: f.filename, lang: f.lang ?? langOf(f.filename), beforeSrc: f.before, afterSrc: f.after, beforeLines: before, hunks };
    })
    .filter((f) => f.hunks.length > 0);
  if (prepared.length === 0) throw new Error("codediff: no textual differences to show.");

  const narration = await narrateChange({
    files: prepared.map((p) => ({ filename: p.filename, before: p.beforeSrc, after: p.afterSrc, hunks: p.hunks })),
    language: params.narrationLang,
  });

  const order = isPermutation(narration.fileOrder, prepared.length) ? narration.fileOrder : prepared.map((_, i) => i);
  const meta = new Map(narration.files.map((f) => [f.index, f]));
  const scenarioFiles: ScenarioFile[] = order.map((idx) => {
    const p = prepared[idx];
    const m = meta.get(idx);
    const whyByHunk = new Map((m?.hunks ?? []).map((h) => [h.index, h.why]));
    return {
      filename: p.filename,
      lang: p.lang,
      before: p.beforeLines,
      intro: m?.intro ?? "",
      hunks: p.hunks.map((h, i) => ({ ...h, why: whyByHunk.get(i) ?? "" })),
    };
  });
  const scenario: CodeScenario = {
    title: narration.title,
    repoLabel: params.repoLabel,
    narrationLang: params.narrationLang ?? "fr",
    files: scenarioFiles,
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

/** Convenience: render a single-file before/after. */
export async function renderCodeDiffVideo(params: {
  before: string;
  after: string;
  filename: string;
  lang?: string;
  outWebm: string;
  narrationLang?: string;
  viewport?: { width: number; height: number };
}): Promise<{ webm: string; scenario: CodeScenario; narration: Narration }> {
  return renderCodeDiff({
    files: [{ filename: params.filename, before: params.before, after: params.after, lang: params.lang }],
    outWebm: params.outWebm,
    narrationLang: params.narrationLang,
    viewport: params.viewport,
  });
}

/** Convenience: render a whole git commit (multi-file, LLM-ordered). */
export async function renderGitCommitVideo(params: {
  repo: string;
  ref: string;
  outWebm: string;
  narrationLang?: string;
  maxFiles?: number;
  viewport?: { width: number; height: number };
}): Promise<{ webm: string; scenario: CodeScenario; narration: Narration }> {
  const files = await filesFromGitCommit(params.repo, params.ref, { maxFiles: params.maxFiles });
  if (files.length === 0) throw new Error(`codediff: no code changes found in ${params.ref}.`);
  const short = params.ref.length > 10 ? params.ref.slice(0, 8) : params.ref;
  const repoLabel = `${path.basename(params.repo)} @ ${short}`;
  return renderCodeDiff({ files, repoLabel, narrationLang: params.narrationLang, outWebm: params.outWebm, viewport: params.viewport });
}
