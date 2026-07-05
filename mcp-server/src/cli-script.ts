/**
 * Scenario — voice-over SCRIPT generator.
 *
 * Given a demo GOAL (and the app URL for light context) plus a target duration,
 * write a concise, natural spoken-narration script sized to be read aloud in
 * roughly that many seconds (~2.5 words/sec). Prints the script to stdout so the
 * web `/api/script` route can capture it.
 *
 *   SCRIPT_GOAL=… SCRIPT_URL=… SCRIPT_DURATION=40 npx tsx src/cli-script.ts
 *
 * Reuses the same planner model selection the engine uses (Nebius Nemotron when
 * available, else the OpenRouter/Anthropic stack) so no extra config is needed.
 */
import "./env.js";
import { generateText } from "ai";
import { selectPlannerModel } from "./providers.js";

const GOAL = process.env.SCRIPT_GOAL?.trim() || "";
const URL = process.env.SCRIPT_URL?.trim() || "";
const DURATION = Math.max(
  5,
  Math.min(180, Number(process.env.SCRIPT_DURATION) || 40),
);

// ~2.5 spoken words per second is a comfortable narration pace.
const WORDS_PER_SEC = 2.5;
const TARGET_WORDS = Math.round(DURATION * WORDS_PER_SEC);

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
      "You write voice-over narration scripts for short product-demo videos. " +
      "Given the GOAL of a demo (what the viewer will watch happen on screen) " +
      "write a single, natural spoken narration that a presenter reads aloud " +
      "over the recording. " +
      "Rules: warm, confident, plain English. Present tense, second person where " +
      "natural ('you'). No stage directions, no timestamps, no numbered steps, no " +
      "markdown, no quotes, no headings — just the words to be spoken. Do not " +
      "mention that this is AI-generated. Write ONE flowing script of a few short " +
      "sentences.",
    prompt:
      `GOAL: ${GOAL}\n` +
      (URL ? `APP URL (context only, do not read aloud): ${URL}\n` : "") +
      `\nWrite the narration to be spoken in about ${DURATION} seconds — ` +
      `aim for roughly ${TARGET_WORDS} words. Output only the script.`,
  });

  const script = text.trim();
  if (!script) throw new Error("model returned an empty script");
  // stdout is captured by the caller; keep it to just the script.
  process.stdout.write(script);
}

main().catch((e) => {
  console.error("script generation failed:", (e as Error).message);
  process.exit(1);
});
