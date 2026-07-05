/**
 * Scenario — per-step voice-over DRAFT generator.
 *
 * Given a demo GOAL (and the app URL for light context), write a short draft
 * narration as ONE SPOKEN LINE PER STEP (newline-separated). The wizard shows
 * these as editable lines; the engine narrates one line per meaningful UI step
 * and the total length ADAPTS to the flow (audio-driven) — so the exact step
 * count is decided at record time, and any extra/short lines are padded or
 * truncated to the real steps.
 *
 *   SCRIPT_GOAL=… SCRIPT_URL=… npx tsx src/cli-script.ts
 *
 * Reuses the same planner model selection the engine uses (Nebius Nemotron when
 * available, else the OpenRouter/Anthropic stack) so no extra config is needed.
 */
import "./env.js";
import { generateText } from "ai";
import { selectPlannerModel } from "./providers.js";

const GOAL = process.env.SCRIPT_GOAL?.trim() || "";
const URL = process.env.SCRIPT_URL?.trim() || "";

async function main(): Promise<void> {
  if (!GOAL) throw new Error("SCRIPT_GOAL is required");

  const model = selectPlannerModel();
  const { text } = await generateText({
    model,
    // The planner model (Nemotron) is a reasoning model — it spends output
    // tokens thinking before the final text. Keep the budget generous so it
    // never truncates mid-reasoning and returns empty prose.
    maxOutputTokens: 2000,
    providerOptions: { nebius: { reasoningEffort: "low" } },
    system:
      "You write voice-over narration for short product-demo videos, ONE spoken " +
      "line PER STEP the viewer will watch. Given the GOAL, break the demo into a " +
      "handful of natural steps and write one line each. " +
      "Rules: warm, confident, plain English. Present tense, second person where " +
      "natural ('you'). Each line is a short spoken sentence (6–14 words). " +
      "No numbering, no bullets, no timestamps, no markdown, no quotes, no " +
      "headings. Do not mention that this is AI-generated. Output ONLY the lines, " +
      "one per line, separated by newlines.",
    prompt:
      `GOAL: ${GOAL}\n` +
      (URL ? `APP URL (context only, do not read aloud): ${URL}\n` : "") +
      `\nWrite one spoken line per step (aim for 3–6 lines). ` +
      `Output only the lines, one per line.`,
  });

  // Normalize to clean newline-separated lines (strip any stray numbering/bullets).
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim())
    .filter(Boolean);
  const script = lines.join("\n");
  if (!script) throw new Error("model returned an empty script");
  // stdout is captured by the caller; keep it to just the lines.
  process.stdout.write(script);
}

main().catch((e) => {
  console.error("script generation failed:", (e as Error).message);
  process.exit(1);
});
