/**
 * "Code diff as video" from a REAL git commit: takes the commit's changed files,
 * lets Claude order them pedagogically + narrate each hunk, and records the
 * typewriter replay (multi-file, with per-file chapter cards).
 *   CODEDIFF_REPO=/path/to/repo CODEDIFF_REF=<sha|HEAD> npx tsx src/cli-codediff-git.ts
 */
import "./env.js";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { renderGitCommitVideo } from "./codediff.js";

const pexec = promisify(exec);
const REPO = process.env.CODEDIFF_REPO || path.resolve(process.cwd(), "..");
const REF = process.env.CODEDIFF_REF || "HEAD";
const OUT = path.resolve(process.cwd(), "..", ".drift-cache", "codediff-git");
const webm = path.join(OUT, "codediff-git.webm");

console.log(`⧗ git ${path.basename(REPO)} @ ${REF} → diff → narrate (+ pedagogical order) → record…`);
const { scenario, narration } = await renderGitCommitVideo({
  repo: REPO,
  ref: REF,
  outWebm: webm,
  narrationLang: process.env.SCENARIO_LANG || "fr",
  maxFiles: Number(process.env.CODEDIFF_MAXFILES || 6),
});

console.log(`\n✓ « ${narration.title} » — ${scenario.files.length} fichier(s) dans l'ordre choisi par le LLM:`);
scenario.files.forEach((f, i) => {
  console.log(`  ${i + 1}. ${f.filename} — ${f.intro}`);
  f.hunks.forEach((h, hi) => console.log(`       ${hi + 1}) ${h.why}`));
});

const gif = path.join(OUT, "codediff-git.gif");
await pexec(
  `ffmpeg -y -i "${webm}" -vf "fps=12,scale=760:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${gif}"`,
);
console.log(`\n✓ webm: ${webm}\n✓ gif:  ${gif}`);
