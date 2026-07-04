import { generateText, Output, type LanguageModel } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import type { DriftVerdict } from "./types.js";

const VerdictSchema = z.object({
  classification: z
    .enum(["intentional_redesign", "accidental_regression", "platform_constraint"])
    .describe("The nature of the visual/interactive change between BEFORE and AFTER."),
  reasoning: z
    .string()
    .describe(
      "2-4 sentences in the design system's own language. Name the specific token, spacing scale step, radius, or color the change respects or violates. Explain WHY it is right or wrong — not merely that pixels changed.",
    ),
  proposed_diff: z
    .string()
    .describe(
      "The minimal fix that reconciles the drift back to the design tokens: a unified diff or the exact replacement line(s). Empty string when classification is intentional_redesign.",
    ),
  confidence: z.number().min(0).max(1).describe("Self-reported confidence, 0..1."),
});

/** Pick a vision model from whatever key is available (OpenRouter first — hackathon bonus credits). */
function selectModel(): LanguageModel {
  const override = process.env.DRIFT_VLM_MODEL?.trim();
  if (process.env.OPENROUTER_API_KEY) {
    return openrouter(override || "anthropic/claude-sonnet-5");
  }
  if (process.env.ANTHROPIC_API_KEY) {
    // Anthropic-native ids have no provider prefix; tolerate an "anthropic/…" value from OpenRouter-style config.
    return anthropic((override || "claude-sonnet-5").replace(/^anthropic\//, ""));
  }
  throw new Error(
    "No VLM API key found. Add OPENROUTER_API_KEY (recommended — uses the hackathon bonus credits) " +
      "or ANTHROPIC_API_KEY to drift/mcp-server/.env",
  );
}

const SYSTEM = `You are Drift, a senior design-systems engineer with exacting taste.

You review ONE UI change. You are given: the design tokens (the source of truth), the code diff, and renders of the component BEFORE (last committed state) and AFTER (the current edit). Sometimes the renders are a SEQUENCE OF FRAMES capturing an interaction over time (a hover, click, or transition) — in that case, judge the MOTION: its duration, easing, and distance, and whether it matches the motion tokens.

Classify the change as one of:
- "accidental_regression": it drifts AWAY from the design system. Typical tells (all common with AI visual edits): a value that used to come from a token is now hardcoded or off-scale (a magic-number padding, a hex color off the palette, a radius off the scale, a transition duration/ease off the motion scale); OR a brand-new near-duplicate of an existing component/style instead of reusing the token or component. This is the common case.
- "intentional_redesign": a deliberate, coherent change that still respects (or sensibly extends) the system.
- "platform_constraint": forced by a platform or browser, not a design decision.

Rules:
- Reason in the system's OWN language: name the exact token, scale step, color, radius, or motion value involved, and what it should be.
- Explicitly call out hardcoded/raw values that should reference a token, and near-duplication of an existing component.
- Be concise, specific, and decisive.
- When it is a regression, propose the MINIMAL fix that puts the value back on a token.`;

export async function getVerdict(params: {
  beforePngPath: string;
  afterPngPath: string;
  tokensJson: string;
  diff: string;
  filePath: string;
}): Promise<DriftVerdict> {
  const model = selectModel();
  const [beforeBuf, afterBuf] = await Promise.all([
    readFile(params.beforePngPath),
    readFile(params.afterPngPath),
  ]);

  const { output } = await generateText({
    model,
    system: SYSTEM,
    output: Output.object({ schema: VerdictSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `Design tokens (source of truth):\n\n${params.tokensJson}` },
          {
            type: "text",
            text: `Code diff vs last committed state for ${params.filePath}:\n\n${params.diff || "(no textual diff provided)"}`,
          },
          { type: "text", text: "BEFORE — the component as last committed:" },
          { type: "file", mediaType: "image/png", data: beforeBuf },
          { type: "text", text: "AFTER — the component after the edit:" },
          { type: "file", mediaType: "image/png", data: afterBuf },
          { type: "text", text: "Give your verdict on whether this is drift, and if so, how to fix it." },
        ],
      },
    ],
  });

  return output as DriftVerdict;
}

/** Motion-aware verdict: judges an interaction captured as before/after frame sequences. */
export async function getMotionVerdict(params: {
  beforeFramePaths: string[];
  afterFramePaths: string[];
  tokensJson: string;
  diff: string;
  filePath: string;
  interaction: string;
}): Promise<DriftVerdict> {
  const model = selectModel();
  const load = (ps: string[]) => Promise.all(ps.map((p) => readFile(p)));
  const [beforeBufs, afterBufs] = await Promise.all([
    load(params.beforeFramePaths),
    load(params.afterFramePaths),
  ]);
  const asFrames = (bufs: Buffer[]) =>
    bufs.map((b) => ({ type: "file", mediaType: "image/png", data: b })) as any[];

  const { output } = await generateText({
    model,
    system: SYSTEM,
    output: Output.object({ schema: VerdictSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `Design tokens (source of truth):\n\n${params.tokensJson}` },
          {
            type: "text",
            text: `Code diff vs last committed state for ${params.filePath}:\n\n${params.diff || "(none)"}`,
          },
          {
            type: "text",
            text: `Below are frame sequences of a "${params.interaction}" interaction, in time order (frame 0 = resting).`,
          },
          { type: "text", text: `BEFORE — ${beforeBufs.length} frames:` },
          ...asFrames(beforeBufs),
          { type: "text", text: `AFTER — ${afterBufs.length} frames:` },
          ...asFrames(afterBufs),
          {
            type: "text",
            text: "Judge the MOTION (duration, easing, distance) against the motion tokens; give your verdict.",
          },
        ],
      },
    ],
  });

  return output as DriftVerdict;
}
