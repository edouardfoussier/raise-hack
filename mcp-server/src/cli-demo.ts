/**
 * Scenario — the GENERIC one-command demo-video generator.
 *
 *   goal + URL  →  AI plan  →  per-step narrated replay  →  intro/outro  →  final.mp4
 *
 * Proves the hero works on ANY app. Demoed on the local sample onboarding flow
 * (no external credentials — file:// URL, LLM key already in .env).
 *
 *   npx tsx src/cli-demo.ts
 *
 * Env overrides (all optional):
 *   DEMO_URL      — the app to demo (default: local sample-app/flow.html via file://)
 *   DEMO_GOAL     — natural-language goal the AI planner drives toward
 *   DEMO_DEVICE   — "mobile" (default) renders an iPhone 13 portrait frame with a
 *                   touch tap-circle + synthetic iOS keyboard; "desktop" uses a
 *                   landscape viewport with an arrow cursor.
 *   DEMO_TITLE    — brand word on the intro card (default "Scenario")
 *   DEMO_CTA      — outro call-to-action (default "Try it → getscenar.io")
 *   DEMO_HEADERS  — JSON object of extra HTTP headers sent on every request
 *                   (e.g. a Vercel protection-bypass token to reach a protected preview)
 *   DEMO_INIT     — JS source run before each page loads (e.g. seed an auth token)
 *   DEMO_READONLY — "1" to allow GET /api but abort writes (never mutates the target app)
 *   DEMO_VOICE    — "1" to narrate the demo with a Gradium voice-over (uses GRADIUM_VOICE_ID)
 *   DEMO_VOICE_ID — override the Gradium voice id used for the narration (per-request pick)
 *   DEMO_SCRIPT   — edited per-step narration from the web wizard, ONE LINE PER STEP
 *                   (newline-separated). When present it replaces the auto-generated
 *                   per-step lines; length still adapts to the flow.
 *
 * Timing is AUDIO-DRIVEN (Keynoter-style): each step stays on screen for the
 * length of its narration line, so the voice always matches the on-screen action
 * and the TOTAL length ADAPTS to the flow instead of a fixed budget. Captions are
 * burned as a subtitle in a dedicated band BELOW the app — never covering it.
 */
import "./env.js";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { generateText, Output } from "ai";
import { z } from "zod";
import { agentFlow } from "./planner.js";
import { recordLiveFlow, type FlowStep, type CaptionCue } from "./flow.js";
import { selectPlannerModel } from "./providers.js";
import { composeVideo } from "./compose.js";
import { ttsToFile } from "./gradium.js";

const pexecFile = promisify(execFile);

const URL = process.env.DEMO_URL || "file://" + path.resolve(process.cwd(), "../sample-app/flow.html");
const GOAL =
  process.env.DEMO_GOAL ||
  "Sign up: start the onboarding, fill the name with 'Ada Lovelace' and the email with 'ada@example.com', then continue to finish.";
const TITLE = process.env.DEMO_TITLE || "Scenario";
const CTA = process.env.DEMO_CTA || "Try it → getscenar.io";
const BRAND = "#FF5A1F"; // flame orange

// Device: mobile (default) → iPhone 13 portrait + touch + iOS keyboard.
const DEVICE = (process.env.DEMO_DEVICE || "mobile").toLowerCase();
const IS_MOBILE = DEVICE !== "desktop";

/** Parse DEMO_HEADERS (JSON string) → extra HTTP headers, tolerating a bad/empty value. */
function parseHeaders(): Record<string, string> | undefined {
  const raw = process.env.DEMO_HEADERS?.trim();
  if (!raw) return undefined;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) out[k] = String(v);
      return Object.keys(out).length ? out : undefined;
    }
  } catch {
    console.log("  ⚠ DEMO_HEADERS is not valid JSON — ignoring");
  }
  return undefined;
}

const EXTRA_HEADERS = parseHeaders();
const INIT_SCRIPT = process.env.DEMO_INIT?.trim() || undefined;
const READ_ONLY = process.env.DEMO_READONLY === "1";
const VOICE = process.env.DEMO_VOICE === "1";
// Optional edited per-step narration from the web wizard (one line per step).
const SCRIPT = process.env.DEMO_SCRIPT?.trim() || undefined;

/** A short human phrase describing a step, for the narration prompt. */
function describe(s: FlowStep): string {
  switch (s.action) {
    case "click":
      return `click ${s.selector}`;
    case "type":
      return `type "${s.text}" into ${s.selector}`;
    case "hover":
      return `hover ${s.selector}`;
    case "move":
      return `move to ${s.selector}`;
    case "scroll":
      return `scroll${s.selector ? " to " + s.selector : ""}`;
    case "wait":
      return `wait`;
    case "caption":
      return `caption "${s.text}"`;
  }
}

/** Steps a viewer actually sees happen — worth narrating with a line. */
function isMeaningful(s: FlowStep): boolean {
  return s.action === "click" || s.action === "type" || s.action === "hover";
}

/** Deterministic narration if the LLM under-delivers for a given step. */
function fallbackLine(s: FlowStep): string {
  switch (s.action) {
    case "type":
      return "Fill in the details";
    case "click":
      return "Continue to the next step";
    case "hover":
      return "Explore the interface";
    default:
      return "Next step";
  }
}

/** ~2.6 spoken words/sec → estimate ms to read a line when we can't measure it. */
function estimateMs(line: string): number {
  const words = line.trim().split(/\s+/).filter(Boolean).length || 1;
  return Math.round((words / 2.6) * 1000);
}

async function main(): Promise<void> {
  const cacheDir = path.resolve(process.cwd(), "..", ".drift-cache", "demo");

  // ── Step A — PLAN ────────────────────────────────────────────────────────
  console.log(`⧗ planning flow for goal:\n  "${GOAL}"\n  on: ${URL}  (${IS_MOBILE ? "mobile" : "desktop"})\n`);
  const steps = await agentFlow({
    url: URL,
    goal: GOAL,
    maxSteps: 10,
    device: IS_MOBILE ? "iPhone 13" : undefined,
    initScript: INIT_SCRIPT,
    extraHTTPHeaders: EXTRA_HEADERS,
    readOnly: READ_ONLY,
    onStep: (m) => console.log("  ·", m),
  });
  console.log(`\n✓ AI-generated ${steps.length} steps.`);
  if (steps.length === 0) throw new Error("planner produced no steps — cannot build a demo.");

  // ── Step B — PER-STEP NARRATION (one LLM call, or the edited wizard lines) ─
  const meaningful = steps.filter(isMeaningful);
  const lines = await writeLines(meaningful);
  console.log("✓ narration lines:");
  lines.forEach((c, i) => console.log(`   ${i + 1}. ${c}`));

  // ── Step C — VOICE (optional): synth each line, measure its duration ───────
  // audioByIndex[i] = { file, ms } for meaningful step i (undefined if no voice).
  const audioByIndex: ({ file: string; ms: number } | undefined)[] = new Array(meaningful.length);
  let voWork: string | undefined;
  if (VOICE) {
    voWork = await mkdtemp(path.join(tmpdir(), "scenario-vo-"));
    console.log(`\n⧗ synthesizing ${lines.length} narration lines with Gradium…`);
    for (let i = 0; i < lines.length; i++) {
      try {
        const wav = path.join(voWork, `line-${i}.wav`);
        await ttsToFile(lines[i], wav);
        const ms = await probeDurationMs(wav);
        audioByIndex[i] = { file: wav, ms };
        console.log(`   ${i + 1}. ${(ms / 1000).toFixed(1)}s`);
      } catch (e) {
        console.log(`   ${i + 1}. ⚠ TTS failed (${(e as Error).message.split("\n")[0]}) — silent for this line`);
      }
    }
  }

  // ── Step D — INTERLEAVE captions + drive per-step dwell from narration ─────
  // Each meaningful step is preceded by a { caption } whose holdMs = the time the
  // step should stay on screen = max(base dwell, narration duration + tail).
  const TAIL_MS = 500; // small breathing room after each line
  const captioned: FlowStep[] = [];
  let ci = 0;
  for (const s of steps) {
    if (isMeaningful(s)) {
      const line = lines[ci];
      const a = audioByIndex[ci];
      const spoken = a?.ms ?? estimateMs(line);
      const holdMs = Math.max(1100, spoken + TAIL_MS);
      captioned.push({ action: "caption", text: line, holdMs, key: `s${ci}` });
      ci++;
    }
    captioned.push(s);
  }

  // ── Step E — REPLAY (record; capture caption cue timings) ──────────────────
  const webm = path.join(cacheDir, "demo.webm");
  console.log(`\n⧗ recording ${IS_MOBILE ? "mobile" : "desktop"} replay → ${webm}`);
  const { cues } = await recordLiveFlow({
    url: URL,
    steps: captioned,
    // Subtitles are burned into the composed band (below the app), so we do NOT
    // inject the in-app top banner — it must not cover app content.
    captions: false,
    outWebm: webm,
    viewport: IS_MOBILE ? undefined : { width: 900, height: 620 },
    device: IS_MOBILE ? "iPhone 13" : undefined,
    pointer: IS_MOBILE ? "touch" : "cursor",
    keyboard: IS_MOBILE,
    initScript: INIT_SCRIPT,
    extraHTTPHeaders: EXTRA_HEADERS,
    readOnly: READ_ONLY,
  });
  console.log(`✓ replay recorded (${cues.length} timed captions).`);
  const mainDurationMs = await probeDurationMs(webm);

  // ── Step F — COMPOSE (intro + outro + burned subtitle band) ────────────────
  console.log(`\n⧗ composing intro/outro + subtitle band…`);
  const composedDir = path.join(cacheDir, "composed");
  const result = await composeVideo({
    inputVideo: webm,
    title: TITLE,
    subtitle: "AI-generated product demo — deterministic replay",
    cta: CTA,
    url: "getscenar.io",
    brand: BRAND,
    outDir: composedDir,
    subtitles: cues,
    mainDurationMs,
  });

  // ── Step G — VOICE-OVER (place each line at its step's start time) ─────────
  if (VOICE && voWork) {
    try {
      const leadInMs = result.introMs ?? 2200;
      await narratePerStep(result.mp4Path, cues, audioByIndex, leadInMs, voWork);
      console.log(`✓ per-step voice-over muxed into final.mp4`);
    } catch (e) {
      console.log(`  ⚠ voice-over skipped — ${(e as Error).message.split("\n")[0]}`);
    } finally {
      await rm(voWork, { recursive: true, force: true }).catch(() => {});
    }
  }

  console.log(`\n✅ done — ${result.totalSeconds.toFixed(1)}s @ ${result.width}×${result.height}`);
  console.log(`   mp4: ${result.mp4Path}`);
  console.log(`   gif: ${result.gifPath}`);
}

/**
 * Write ONE short narration line per meaningful step. When the wizard passed an
 * edited script (DEMO_SCRIPT, one line per step), use those verbatim; otherwise
 * ask the planner model for an aligned array in a single call.
 */
async function writeLines(meaningful: FlowStep[]): Promise<string[]> {
  const n = meaningful.length;
  if (n === 0) return [];

  // Edited wizard lines win: split on newlines, align to the step count.
  if (SCRIPT) {
    const edited = SCRIPT.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (edited.length) {
      console.log(`\n✓ using ${edited.length} edited narration line(s) from the wizard`);
      return meaningful.map((s, i) => edited[i]?.trim() || fallbackLine(s));
    }
  }

  console.log(`\n⧗ writing ${n} narration lines with one LLM call…`);
  const LineSchema = z.object({
    lines: z
      .array(z.string())
      .describe(
        "One short spoken narration line per numbered step, in the SAME order. Each is a natural spoken sentence (6–14 words), present tense, second person where natural. No numbering, no quotes.",
      ),
  });
  const numbered = meaningful.map((s, i) => `${i + 1}. ${describe(s)}`).join("\n");
  const model = selectPlannerModel();
  let raw: string[] = [];
  try {
    const { output } = await generateText({
      model,
      maxOutputTokens: 2048,
      providerOptions: { nebius: { reasoningEffort: "low" } },
      system:
        "You narrate a product demo video as a voice-over. Given the GOAL and the ordered UI steps, write ONE natural spoken line per step that is READ ALOUD as that step happens on screen. Each line is a short sentence (6–14 words), warm and confident, present tense, second person ('you') where natural. Aligned one-to-one with the steps, in order. " +
        'Reply with a single JSON object: {"lines": string[]}.',
      output: Output.object({ schema: LineSchema }),
      prompt: `GOAL: ${GOAL}\n\nSTEPS (write exactly ${n} lines, one per step, in order):\n${numbered}`,
    });
    raw = (output as z.infer<typeof LineSchema>).lines ?? [];
  } catch {
    console.log("  ⚠ narration LLM call failed — using deterministic lines");
  }
  return meaningful.map((s, i) => raw[i]?.trim() || fallbackLine(s));
}

/**
 * Build the voice-over track by placing each line's synthesized audio at its
 * step's on-screen start time (from the recorded cues), plus the intro lead-in,
 * with silence between lines. Mux over the composed mp4 in place.
 */
async function narratePerStep(
  mp4Path: string,
  cues: CaptionCue[],
  audioByIndex: ({ file: string; ms: number } | undefined)[],
  leadInMs: number,
  work: string,
): Promise<void> {
  // Match each cue (key "s<i>") to its synthesized line audio.
  const placed: { file: string; atMs: number }[] = [];
  for (const cue of cues) {
    const idx = cue.key?.startsWith("s") ? Number(cue.key.slice(1)) : NaN;
    const a = Number.isFinite(idx) ? audioByIndex[idx] : undefined;
    if (a) placed.push({ file: a.file, atMs: leadInMs + cue.startMs });
  }
  if (!placed.length) return;

  // One delayed audio stream per line, all mixed onto a common timeline, then
  // muxed over the video (video copied as-is; full length preserved).
  const inputs: string[] = [];
  const filters: string[] = [];
  placed.forEach((p, i) => {
    inputs.push("-i", p.file);
    // input index in ffmpeg is i+1 (0 is the video).
    filters.push(
      `[${i + 1}:a]adelay=${Math.round(p.atMs)}:all=1,aresample=48000[a${i}]`,
    );
  });
  const mixLabels = placed.map((_, i) => `[a${i}]`).join("");
  const filterComplex =
    filters.join(";") +
    `;${mixLabels}amix=inputs=${placed.length}:normalize=0:dropout_transition=0[mix]` +
    `;[mix]aresample=48000,pan=stereo|c0=c0|c1=c0[vo]`;

  const out = path.join(work, "final-vo.mp4");
  // NB: no -shortest — the VO track ends before the outro, and -shortest would
  // truncate the outro to the audio length. The video (copied) defines length;
  // -apad pads the mix with trailing silence so the muxer never errors on a
  // shorter audio stream.
  await pexecFile("ffmpeg", [
    "-y",
    "-i", mp4Path,
    ...inputs,
    "-filter_complex", filterComplex,
    "-map", "0:v:0",
    "-map", "[vo]",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    out,
  ]);
  await pexecFile("cp", [out, mp4Path]);
}

/** Probe a media file's duration in ms (0 on failure). */
async function probeDurationMs(input: string): Promise<number> {
  try {
    await stat(input);
    const { stdout } = await pexecFile("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      input,
    ]);
    const d = parseFloat(stdout.trim());
    return Number.isFinite(d) ? Math.round(d * 1000) : 0;
  } catch {
    return 0;
  }
}

main().catch((e) => {
  console.error("\n✗ demo generation failed:", (e as Error).message);
  process.exit(1);
});
