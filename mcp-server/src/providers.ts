import type { LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { selectModel } from "./vlm.js";

/**
 * Text-model selection for the flow PLANNER (the observe→decide→act loop in
 * planner.ts): NVIDIA Nemotron served by Nebius Token Factory (OpenAI-compatible).
 *
 * IMPORTANT: Nemotron 3 Super is TEXT-ONLY. This selector is for text tasks
 * (planning, captions) only — the vision review path (getVerdict /
 * getMotionVerdict in vlm.ts) sends images and MUST keep using selectModel().
 */
export const NEMOTRON_MODEL = "nvidia/nemotron-3-super-120b-a12b";

export function selectPlannerModel(): LanguageModel {
  const apiKey = process.env.NEBIUS_API_KEY;
  if (apiKey) {
    const nebius = createOpenAICompatible({
      name: "nebius",
      apiKey,
      baseURL: "https://api.tokenfactory.nebius.com/v1/",
      supportsStructuredOutputs: true, // response_format: json_schema for the Decision schema
    });
    return nebius(process.env.DRIFT_PLANNER_MODEL?.trim() || NEMOTRON_MODEL);
  }
  // No Nebius key → fall back to the general model stack (OpenRouter/Anthropic).
  return selectModel();
}
