/**
 * Demo the "code diff as video" mode: a small correction/refactor replayed as a
 * typewriter animation with Claude-narrated, synchronized subtitles.
 *   npx tsx src/cli-codediff.ts
 * Outputs a webm + gif under .drift-cache/codediff/.
 */
import "./env.js";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { renderCodeDiffVideo } from "./codediff.js";

const pexec = promisify(exec);

const FILENAME = "utils/stats.js";
const BEFORE = `function averageAboveThreshold(values, threshold) {
  let total = 0;
  let count = 0;
  for (let i = 0; i <= values.length; i++) {
    if (values[i] > threshold) {
      total += values[i];
      count++;
    }
  }
  return total / count;
}`;
const AFTER = `function averageAboveThreshold(values, threshold) {
  let total = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > threshold) {
      total += values[i];
      count++;
    }
  }
  if (count === 0) return 0;
  return total / count;
}`;

const OUT = path.resolve(process.cwd(), "..", ".drift-cache", "codediff");
const webmPath = path.join(OUT, "codediff.webm");

console.log("⧗ diffing + narrating (Claude) + recording the code-diff video…");
const { scenario, narration } = await renderCodeDiffVideo({
  before: BEFORE,
  after: AFTER,
  filename: FILENAME,
  lang: "javascript",
  narrationLang: process.env.SCENARIO_LANG || "fr",
  outWebm: webmPath,
});

console.log(`\n✓ « ${narration.title} » — ${scenario.files[0].hunks.length} hunk(s):`);
scenario.files[0].hunks.forEach((h, i) => console.log(`  ${i + 1}. ${h.why}`));

const gif = path.join(OUT, "codediff.gif");
await pexec(
  `ffmpeg -y -i "${webmPath}" -vf "fps=12,scale=760:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${gif}"`,
);
console.log(`\n✓ webm: ${webmPath}\n✓ gif:  ${gif}  (${((await readFile(gif)).length / 1e6).toFixed(1)} MB)`);
