import path from "node:path";
import { readFile, readdir, mkdir, rm } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getRepoRoot, getHeadContent, getWorkingContent, getDiff, toRepoRel } from "./git.js";
import { recordFlow, type FlowStep } from "./flow.js";
import { getMotionVerdict } from "./vlm.js";
import type { DriftVerdict } from "./types.js";

const pexec = promisify(exec);

export interface FlowDef {
  /** App root to serve, relative to the repo root. */
  appDir: string;
  /** Entry HTML, relative to appDir. */
  preview: string;
  viewport?: { width: number; height: number };
  steps: FlowStep[];
}

export interface FlowReview {
  verdict: DriftVerdict;
  beforeWebm: string;
  afterWebm: string;
  diff: string;
  fileRel: string;
  outDir: string;
}

async function extractFrames(webm: string, dir: string, fps = 0.7): Promise<string[]> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await pexec(`ffmpeg -y -i "${webm}" -vf "fps=${fps}" "${path.join(dir, "f-%03d.png")}"`);
  return (await readdir(dir))
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => path.join(dir, f));
}

/** Replay the flow BEFORE (HEAD) vs AFTER (working) and get a VLM verdict. Returns null if nothing changed. */
export async function reviewFlow(absFile: string, flow: FlowDef): Promise<FlowReview | null> {
  const repoRoot = await getRepoRoot(absFile);
  const fileRel = toRepoRel(repoRoot, absFile);
  const appDir = path.resolve(repoRoot, flow.appDir);
  const changedRelToApp = path.relative(appDir, absFile);
  const outDir = path.resolve(repoRoot, ".drift-cache", "flow");

  const diff = await getDiff(repoRoot, fileRel);
  if (!diff) return null;

  const beforeContent = await getHeadContent(repoRoot, fileRel);
  const afterContent = await getWorkingContent(absFile);
  const common = {
    appDir,
    previewRel: flow.preview,
    changedRelToApp,
    viewport: flow.viewport ?? { width: 760, height: 560 },
    steps: flow.steps,
  };

  const beforeWebm = await recordFlow({ ...common, content: beforeContent, outWebm: path.join(outDir, "before.webm") });
  const afterWebm = await recordFlow({ ...common, content: afterContent, outWebm: path.join(outDir, "after.webm") });

  const beforeFrames = await extractFrames(beforeWebm, path.join(outDir, "bf"));
  const afterFrames = await extractFrames(afterWebm, path.join(outDir, "af"));
  const tokensJson = await readFile(path.join(appDir, "tokens.json"), "utf8").catch(() => "(no tokens.json found)");
  const verdict = await getMotionVerdict({
    beforeFramePaths: beforeFrames,
    afterFramePaths: afterFrames,
    tokensJson,
    diff,
    filePath: fileRel,
    interaction: "onboarding user flow",
  });

  return { verdict, beforeWebm, afterWebm, diff, fileRel, outDir };
}
