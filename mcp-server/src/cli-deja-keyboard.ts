/**
 * Focused visual demo of the MOBILE overlays on the REAL deja-bu app:
 *   • touch pointer (tap ripple) instead of a desktop arrow cursor
 *   • synthetic iOS keyboard that slides up when a text field is focused
 * Read-only (GET allowed, writes aborted) — never mutates prod. No git/drift ops.
 *
 *   DEJA_PWD='…' npx tsx src/cli-deja-keyboard.ts
 * Requires the deja-bu dev server at http://localhost:5173 and DEJA_PWD (auth token).
 */
import "./env.js";
import path from "node:path";
import { readdir, mkdir, rm } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { recordLiveFlow, type FlowStep } from "./flow.js";

const pexec = promisify(exec);
const OUT = path.resolve(process.cwd(), "..", ".drift-cache", "deja-keyboard");
const URL = process.env.DEJA_URL || "http://localhost:5173/";
const PWD = process.env.DEJA_PWD || ""; // real deja-bu password — set via env, never commit it
if (!PWD) console.warn("⚠ DEJA_PWD not set — the app may show a login screen and #cl-supplier won't exist.");

// Bypass auth by seeding the token deja-bu reads from localStorage.
const initScript = `try{localStorage.setItem('deja-bu:v1:auth-token', JSON.stringify(${JSON.stringify(PWD)}));}catch(e){}`;

// Flow (all read-only — never clicks Valider/Enregistrer, so no writes):
//   1. resume a paused reception → the checklist line card (👆 tap ripple)
//   2. touch pointer rests on the teal ✅ Valider CTA
//   3. tap ✎ Corriger la quantité → tap the note field → ⌨ iOS keyboard slides up,
//      type a note (the field lifts clear of the keys, like real iOS)
const STEPS: FlowStep[] = [
  { action: "wait", ms: 900 },
  { action: "scroll", by: 300, dwell: 700 }, // 📜 scroll the Réception screen…
  { action: "scroll", by: -300, dwell: 500 }, // …and back up
  { action: "click", selector: 'button:has-text("Reprendre")' }, // 👆 resume → checklist
  { action: "wait", ms: 2600 },
  { action: "hover", selector: 'button:has-text("Valider")', dwell: 1300 }, // touch pointer on the teal CTA
  { action: "click", selector: 'button:has-text("Corriger")' }, // reveal the correction UI
  { action: "wait", ms: 700 },
  { action: "type", selector: "textarea", text: "1 carton abîmé" }, // ⌨ iOS keyboard + type note
  { action: "wait", ms: 2400 },
  { action: "wait", ms: 300 },
];

console.log("⧗ recording mobile tap + iOS keyboard demo on deja-bu (read-only)…");
const webm = await recordLiveFlow({
  url: URL,
  steps: STEPS,
  outWebm: path.join(OUT, "keyboard-demo.webm"),
  device: "iPhone 13",
  readOnly: true,
  initScript,
  pointer: "touch",
  keyboard: true,
});
console.log(`✓ recorded: ${webm}`);

// Extract frames so we can eyeball the keyboard-up + tap-ripple moments.
const framesDir = path.join(OUT, "frames");
await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });
await pexec(`ffmpeg -y -i "${webm}" -vf "fps=2" "${path.join(framesDir, "f-%03d.png")}"`);
const frames = (await readdir(framesDir)).filter((f) => f.endsWith(".png")).sort();
console.log(`✓ ${frames.length} frames → ${framesDir}`);

// And a looping gif for the report / submission.
const gif = path.join(OUT, "keyboard-demo.gif");
await pexec(
  `ffmpeg -y -i "${webm}" -vf "fps=12,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${gif}"`,
);
console.log(`✓ gif → ${gif}`);
