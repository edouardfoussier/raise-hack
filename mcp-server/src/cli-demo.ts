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
 *   DEMO_URL    — the app to demo (default: local sample-app/flow.html via file://)
 *   DEMO_GOAL   — natural-language goal the AI planner drives toward
 *   DEMO_TITLE  — brand word on the intro card (default "Scenario")
 *   DEMO_CTA    — outro call-to-action (default "Try it → getscenar.io")
 */
import "./env.js";
import path from "node:path";
import { generateText, Output } from "ai";
import { z } from "zod";
import { agentFlow } from "./planner.js";
import { recordLiveFlow, type FlowStep } from "./flow.js";
import { selectModel } from "./vlm.js";
import { composeVideo } from "./compose.js";

const URL = process.env.DEMO_URL || "file://" + path.resolve(process.cwd(), "../sample-app/flow.html");
const GOAL =
  process.env.DEMO_GOAL ||
  "Sign up: start the onboarding, fill the name with 'Ada Lovelace' and the email with 'ada@example.com', then continue to finish.";
const TITLE = process.env.DEMO_TITLE || "Scenario";
const CTA = process.env.DEMO_CTA || "Try it → getscenar.io";
const BRAND = "#FF5A1F"; // flame orange

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
  const model = selectModel();
  const { output } = await generateText({
    model,
    system:
      "You narrate a product demo video. Given the GOAL and the ordered UI steps, write ONE short caption per step that a viewer reads as it happens. Captions must be concise (≤ 8 words), plain English, and aligned one-to-one with the steps in order.",
    output: Output.object({ schema: CaptionSchema }),
    prompt: `GOAL: ${GOAL}\n\nSTEPS (write exactly ${meaningful.length} captions, one per step, in order):\n${numbered}`,
  });

  const raw = (output as z.infer<typeof CaptionSchema>).captions ?? [];
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

  console.log(`\n✅ done — ${result.totalSeconds.toFixed(1)}s @ ${result.width}×${result.height}`);
  console.log(`   mp4: ${result.mp4Path}`);
  console.log(`   gif: ${result.gifPath}`);
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
