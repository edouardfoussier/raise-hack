/**
 * Batch review driver for the Scenario "Reviews per commit" feature.
 *
 * For each simulated "commit" it:
 *   1. applies a drift to sample-app/components.css (string replacements),
 *   2. renders BEFORE (git HEAD) vs AFTER (working tree) PNGs via the SAME engine,
 *   3. asks the VLM for a real verdict via getVerdict,
 *   4. copies per-commit before/after PNGs into .drift-cache/reviews/,
 *   5. reverts the drift (`git checkout -- <file>`), leaving the tree clean.
 *
 * Finally it writes .drift-cache/reviews/manifest.json with every verdict.
 *
 *   npm run reviews-batch      (or: tsx src/cli-reviews-batch.ts)
 */
import "./env.js";
// The OpenRouter provider (v2.10.0) + ai v7 mis-serializes image content
// ("invalid base64 data"). The Anthropic-native provider works. Force it by
// dropping the OpenRouter key and using an un-prefixed model id so selectModel()
// falls through to the anthropic() branch.
delete process.env.OPENROUTER_API_KEY;
process.env.DRIFT_VLM_MODEL = "claude-sonnet-5";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { getRepoRoot, getHeadContent, getWorkingContent, getDiff, toRepoRel } from "./git.js";
import { renderBeforeAfter } from "./render.js";
import { getVerdict } from "./vlm.js";
import type { DriftVerdict } from "./types.js";

const exec = promisify(execFile);

const cssAbs = path.resolve(process.cwd(), "../sample-app/components.css");
const repoRoot = await getRepoRoot(cssAbs);
const repoRel = toRepoRel(repoRoot, cssAbs);
const appDir = path.dirname(cssAbs);
const previewRel = "preview.html";
const changedRelToApp = path.basename(cssAbs);
const selector = "#demo-button";
const reviewsDir = path.resolve(repoRoot, ".drift-cache", "reviews");
const tokensJson = await readFile(path.resolve(appDir, "tokens.json"), "utf8");

/** A simulated commit: id, message, a plausible short hash, and the css edits it introduces. */
interface CommitSpec {
  id: string;
  hash: string;
  message: string;
  /** [find, replace] pairs applied in order to the committed CSS to produce the drift. */
  edits: Array<[string, string]>;
}

const commits: CommitSpec[] = [
  {
    id: "01-padding-color-regression",
    hash: "a3f9c21",
    message: "tweak CTA button padding + color for a punchier hero",
    edits: [
      [
        "padding: var(--space-md) var(--space-lg); /* 12px 16px — on the spacing scale */",
        "padding: 14px 16px;",
      ],
      ["background: var(--color-brand);", "background: #3B82F6;"],
    ],
  },
  {
    id: "02-motion-regression",
    hash: "7b1e4d8",
    message: "slow down button hover so it feels smoother",
    edits: [
      [
        `transition:
    background var(--motion-fast) var(--ease-standard),
    transform var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard);`,
        "transition: all 450ms linear;",
      ],
    ],
  },
  {
    id: "03-intentional-redesign",
    hash: "c52a0f6",
    message: "make the hero CTA a larger pill — steps to the next scale rungs, all on-token",
    edits: [
      // COHERENT resize decision, every value a REAL token and no collision with
      // .btn--secondary: step padding up one rung on the space scale
      // (md/lg 12/16 -> lg/xl 16/24) AND step radius one rung (md -> pill).
      // Keeps the brand fill + brand-hover + brand-tinted shadow, so nothing
      // contradicts. Reads as one deliberate "bigger pill CTA" choice.
      [
        "padding: var(--space-md) var(--space-lg); /* 12px 16px — on the spacing scale */\n  border-radius: var(--radius-md);",
        "padding: var(--space-lg) var(--space-xl); /* 16px 24px — up one rung on the spacing scale */\n  border-radius: var(--radius-pill);",
      ],
    ],
  },
  {
    id: "04-platform-tap-target",
    hash: "e0d7b93",
    message: "meet 44px WCAG/iOS tap target + kill 300ms tap delay on touch",
    edits: [
      // Platform-forced: WCAG 2.5.5 / iOS HIG 44px minimum touch target, plus
      // touch-action:manipulation to remove the mobile-browser 300ms tap delay.
      // Neither has a design-token analog because they are platform requirements,
      // not stylistic choices.
      [
        "line-height: 1.2;\n  cursor: pointer;",
        "line-height: 1.2;\n  min-height: 44px; /* WCAG 2.5.5 / iOS HIG min tap target */\n  touch-action: manipulation; /* remove 300ms tap delay on touch */\n  cursor: pointer;",
      ],
    ],
  },
];

async function revert(): Promise<void> {
  await exec("git", ["checkout", "--", repoRel], { cwd: repoRoot });
}

async function applyEdits(spec: CommitSpec): Promise<void> {
  const original = await getHeadContent(repoRoot, repoRel);
  let out = original;
  for (const [find, replace] of spec.edits) {
    if (!out.includes(find)) {
      throw new Error(`[${spec.id}] edit target not found:\n---\n${find}\n---`);
    }
    out = out.replace(find, replace);
  }
  await writeFile(cssAbs, out, "utf8");
}

interface ManifestEntry {
  id: string;
  hash: string;
  message: string;
  classification: string;
  confidence: number;
  reasoning: string;
  proposed_diff: string;
  diff: string;
  beforePng: string;
  afterPng: string;
}

async function main() {
  await mkdir(reviewsDir, { recursive: true });
  // Safety: start from a clean tree.
  await revert();

  const manifest: ManifestEntry[] = [];

  for (const spec of commits) {
    console.log(`\n=== ${spec.id} · ${spec.message} ===`);
    try {
      await applyEdits(spec);
      const beforeContent = await getHeadContent(repoRoot, repoRel);
      const afterContent = await getWorkingContent(cssAbs);
      const diff = await getDiff(repoRoot, repoRel);

      console.log("⧗ rendering before/after…");
      const r = await renderBeforeAfter({
        appDir,
        previewRel,
        changedRelToApp,
        beforeContent,
        afterContent,
        selector,
        outDir: reviewsDir,
      });

      // Copy the shared before/after.png into per-commit files immediately
      // (renderBeforeAfter always overwrites .drift-cache/reviews/before.png).
      const beforePng = path.join(reviewsDir, `${spec.id}-before.png`);
      const afterPng = path.join(reviewsDir, `${spec.id}-after.png`);
      await copyFile(r.beforePngPath, beforePng);
      await copyFile(r.afterPngPath, afterPng);

      console.log("⧗ asking the VLM for a verdict…");
      const verdict: DriftVerdict = await getVerdict({
        beforePngPath: beforePng,
        afterPngPath: afterPng,
        tokensJson,
        diff,
        filePath: repoRel,
      });

      console.log(`→ ${verdict.classification} (${Math.round(verdict.confidence * 100)}%)`);
      console.log(`  ${verdict.reasoning}`);

      manifest.push({
        id: spec.id,
        hash: spec.hash,
        message: spec.message,
        classification: verdict.classification,
        confidence: verdict.confidence,
        reasoning: verdict.reasoning,
        proposed_diff: verdict.proposed_diff,
        diff,
        beforePng: path.relative(reviewsDir, beforePng),
        afterPng: path.relative(reviewsDir, afterPng),
      });
    } finally {
      await revert();
    }
  }

  const manifestPath = path.join(reviewsDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\n✓ manifest: ${manifestPath}`);
  console.log(`✓ ${manifest.length} verdicts written.`);

  // Final clean check.
  const { stdout } = await exec("git", ["status", "--short", "--", repoRel], { cwd: repoRoot });
  console.log(`\ngit status (should be empty): "${stdout.trim()}"`);
}

main().catch(async (e) => {
  await revert().catch(() => {});
  console.error(e);
  process.exit(1);
});
