/**
 * Scenario — the GENERIC one-command demo-video generator.
 *
 *   goal + URL  →  AI plan  →  captioned deterministic replay  →  intro/outro  →  final.mp4
 *
 * Proves the hero works on ANY app. Demoed on the local sample onboarding flow
 * (no external credentials — file:// URL, LLM key already in .env).
 *
 *   npx tsx src/cli-demo.ts
 *
 * Env overrides (all optional):
 *   DEMO_URL     — the app to demo (default: local sample-app/flow.html via file://)
 *   DEMO_GOAL    — natural-language goal the AI planner drives toward
 *   DEMO_TITLE   — brand word on the intro card (default "Scenario")
 *   DEMO_CTA     — outro call-to-action (default "Try it → getscenar.io")
 *   DEMO_HEADERS — JSON object of extra HTTP headers sent on every request
 *                  (e.g. a Vercel protection-bypass token to reach a protected preview)
 *   DEMO_INIT    — JS source run before each page loads (e.g. seed an auth token in localStorage)
 *   DEMO_READONLY — "1" to allow GET /api but abort writes (never mutates the target app)
 *   DEMO_VOICE   — "1" to narrate the demo with a Gradium voice-over (uses GRADIUM_VOICE_ID)
 *   DEMO_VOICE_ID — override the Gradium voice id used for the narration (per-request pick)
 *   DEMO_SCRIPT  — the exact voice-over text to narrate (edited in the web wizard). When
 *                  present it replaces the auto-caption narration; captions stay independent.
 */
import "./env.js";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { generateText, Output } from "ai";
import { z } from "zod";
import { agentFlow } from "./planner.js";
import { recordLiveFlow, type FlowStep } from "./flow.js";
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
// Optional edited voice-over script from the web wizard. When set, it is
// narrated verbatim instead of the auto-generated captions.
const SCRIPT = process.env.DEMO_SCRIPT?.trim() || undefined;

/** A short human phrase describing a step, for the captioning prompt. */
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

/** Steps a viewer actually sees happen — worth narrating with a caption. */
function isMeaningful(s: FlowStep): boolean {
  return s.action === "click" || s.action === "type" || s.action === "hover";
}

async function main(): Promise<void> {
  const cacheDir = path.resolve(process.cwd(), "..", ".drift-cache", "demo");

  // ── Step A — PLAN ────────────────────────────────────────────────────────
  console.log(`⧗ planning flow for goal:\n  "${GOAL}"\n  on: ${URL}\n`);
  const steps = await agentFlow({
    url: URL,
    goal: GOAL,
    maxSteps: 10,
    initScript: INIT_SCRIPT,
    extraHTTPHeaders: EXTRA_HEADERS,
    readOnly: READ_ONLY,
    onStep: (m) => console.log("  ·", m),
  });
  console.log(`\n✓ AI-generated ${steps.length} steps.`);
  if (steps.length === 0) throw new Error("planner produced no steps — cannot build a demo.");

  // ── Step B — CAPTIONS (one LLM call) ─────────────────────────────────────
  const meaningful = steps.filter(isMeaningful);
  console.log(`\n⧗ writing ${meaningful.length} captions with one LLM call…`);

  const CaptionSchema = z.object({
    captions: z
      .array(z.string())
      .describe(
        "One concise English caption per numbered step, in the SAME order. Each ≤ 8 words, present tense, describes what the user sees happen (e.g. 'Fill in your name', 'Continue to finish'). No numbering, no quotes.",
      ),
  });

  const numbered = meaningful.map((s, i) => `${i + 1}. ${describe(s)}`).join("\n");
  const model = selectPlannerModel(); // text-only task → Nemotron (Nebius) when available
  let raw: string[] = [];
  try {
    const { output } = await generateText({
      model,
      maxOutputTokens: 2048,
      providerOptions: { nebius: { reasoningEffort: "low" } },
      system:
        "You narrate a product demo video. Given the GOAL and the ordered UI steps, write ONE short caption per step that a viewer reads as it happens. Captions must be concise (≤ 8 words), plain English, and aligned one-to-one with the steps in order. " +
        'Reply with a single JSON object: {"captions": string[]}.',
      output: Output.object({ schema: CaptionSchema }),
      prompt: `GOAL: ${GOAL}\n\nSTEPS (write exactly ${meaningful.length} captions, one per step, in order):\n${numbered}`,
    });
    raw = (output as z.infer<typeof CaptionSchema>).captions ?? [];
  } catch {
    console.log("  ⚠ caption LLM call failed — using deterministic captions");
  }
  // Align defensively: pad/truncate to the meaningful-step count.
  const captions: string[] = meaningful.map((s, i) => (raw[i]?.trim() || fallbackCaption(s)));
  console.log("✓ captions:");
  captions.forEach((c, i) => console.log(`   ${i + 1}. ${c}`));

  // Interleave a { action: "caption" } BEFORE each meaningful step.
  const captioned: FlowStep[] = [];
  let ci = 0;
  for (const s of steps) {
    if (isMeaningful(s)) captioned.push({ action: "caption", text: captions[ci++] });
    captioned.push(s);
  }

  // ── Step C — REPLAY (captioned, deterministic) ───────────────────────────
  const webm = path.join(cacheDir, "demo.webm");
  console.log(`\n⧗ recording captioned replay → ${webm}`);
  await recordLiveFlow({
    url: URL,
    steps: captioned,
    captions: true,
    outWebm: webm,
    viewport: { width: 760, height: 560 },
    initScript: INIT_SCRIPT,
    extraHTTPHeaders: EXTRA_HEADERS,
    readOnly: READ_ONLY,
  });
  console.log(`✓ replay recorded.`);

  // ── Step D — COMPOSE (intro + outro, branded) ────────────────────────────
  console.log(`\n⧗ composing intro/outro cards…`);
  const composedDir = path.join(cacheDir, "composed");
  const result = await composeVideo({
    inputVideo: webm,
    title: TITLE,
    subtitle: "AI-generated product demo — deterministic replay",
    cta: CTA,
    url: "getscenar.io",
    brand: BRAND,
    outDir: composedDir,
  });

  // ── Step E — VOICE-OVER (optional, Gradium narration muxed over the mp4) ──
  if (VOICE) {
    try {
      if (SCRIPT) {
        console.log(`\n⧗ narrating edited script with Gradium voice…`);
      } else {
        console.log(`\n⧗ narrating captions with Gradium voice…`);
      }
      // An edited wizard script (DEMO_SCRIPT) is narrated verbatim; otherwise
      // fall back to the auto-generated captions joined into a sentence.
      await narrateOver(result.mp4Path, captions, (result.introMs ?? 2200) / 1000, SCRIPT);
      console.log(`✓ voice-over muxed into final.mp4`);
    } catch (e) {
      console.log(`  ⚠ voice-over skipped — ${(e as Error).message.split("\n")[0]}`);
    }
  }

  console.log(`\n✅ done — ${result.totalSeconds.toFixed(1)}s @ ${result.width}×${result.height}`);
  console.log(`   mp4: ${result.mp4Path}`);
  console.log(`   gif: ${result.gifPath}`);
}

/**
 * Synthesize a single narration WAV and mux it over the finished mp4 (in place).
 * A `leadIn` of silence is prepended so the voice starts roughly when the intro
 * card ends and the real flow begins.
 *
 * When `scriptOverride` is provided (the edited voice-over from the web wizard)
 * it is narrated verbatim. Otherwise the ordered captions are joined into one
 * natural sentence so the clone reads them as a flowing voice-over.
 */
async function narrateOver(
  mp4Path: string,
  captions: string[],
  leadIn: number,
  scriptOverride?: string,
): Promise<void> {
  const script = (scriptOverride?.trim()
    ? scriptOverride.trim()
    : captions
        .map((c) => c.trim().replace(/[.]+$/, ""))
        .filter(Boolean)
        .join(". ")
        .concat("."));
  if (!script) return;

  const work = await mkdtemp(path.join(tmpdir(), "scenario-vo-"));
  try {
    const voRaw = path.join(work, "vo.wav");
    await ttsToFile(script, voRaw);

    // Prepend lead-in silence so narration lands after the intro card.
    const vo = path.join(work, "vo-lead.wav");
    await pexecFile("ffmpeg", [
      "-y", "-i", voRaw,
      "-af", `adelay=${Math.round(leadIn * 1000)}:all=1,aresample=48000`,
      "-ar", "48000", "-ac", "2",
      vo,
    ]);

    // Mux over the video (keep video as-is; audio → AAC; keep full video length).
    const out = path.join(work, "final-vo.mp4");
    await pexecFile("ffmpeg", [
      "-y", "-i", mp4Path, "-i", vo,
      "-map", "0:v:0", "-map", "1:a:0",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart",
      out,
    ]);

    // Replace the original mp4 with the narrated one.
    await pexecFile("cp", [out, mp4Path]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

/** Deterministic caption if the LLM under-delivers for a given step. */
function fallbackCaption(s: FlowStep): string {
  switch (s.action) {
    case "type":
      return "Fill in the details";
    case "click":
      return "Continue";
    case "hover":
      return "Explore the interface";
    default:
      return "Next step";
  }
}

main().catch((e) => {
  console.error("\n✗ demo generation failed:", (e as Error).message);
  process.exit(1);
});
