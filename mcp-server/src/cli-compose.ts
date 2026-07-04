/**
 * Demo the video compositor: wrap the finished reception demo with a branded
 * intro card + outro CTA card and export final.mp4 + final.gif.
 *   npx tsx src/cli-compose.ts
 * Outputs under .drift-cache/deja-reception/composed/.
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { composeVideo } from "./compose.js";

const inputVideo = path.resolve(process.cwd(), "..", ".drift-cache", "deja-reception", "reception.webm");
const outDir = path.resolve(process.cwd(), "..", ".drift-cache", "deja-reception", "composed");

console.log("⧗ composing intro + demo + outro …");
const res = await composeVideo({
  inputVideo,
  title: "Scenario",
  subtitle: "AI-generated product demo — deterministic replay",
  cta: "Try it → getscenar.io",
  url: "getscenar.io",
  outDir,
});

const [mp4Size, gifSize] = await Promise.all([
  readFile(res.mp4Path).then((b) => b.length),
  readFile(res.gifPath).then((b) => b.length),
]);

console.log(`\n✓ ${res.width}×${res.height} @ ${res.fps}fps — total ${res.totalSeconds.toFixed(2)}s`);
console.log(`  intro ${res.introMs}ms · outro ${res.outroMs}ms`);
console.log(`✓ mp4: ${res.mp4Path}  (${(mp4Size / 1e6).toFixed(2)} MB)`);
console.log(`✓ gif: ${res.gifPath}  (${(gifSize / 1e6).toFixed(2)} MB)`);
