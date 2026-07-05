# NVIDIA Nemotron — the flow planner

**What it does:** NVIDIA Nemotron plans the deterministic demo. The agentic planner
(`mcp-server/src/planner.ts` → `agentFlow`) runs an observe→decide→act loop over the live app:
each turn, Nemotron sees the interactable elements + history and decides the single next action
(click / type / hover), producing a concrete `FlowStep[]` that is then replayed deterministically
for the before/after videos. It also writes the on-screen step captions (`src/cli-demo.ts`).

**Model:** `nvidia/nemotron-3-super-120b-a12b`, served by **Nebius Token Factory**
(OpenAI-compatible endpoint `https://api.tokenfactory.nebius.com/v1/`).

**Config:** set `NEBIUS_API_KEY` in `mcp-server/.env` — the planner auto-routes to Nemotron
(`src/providers.ts` → `selectPlannerModel()`); without the key it falls back to the default stack.
The image-based drift verdicts stay on a vision model (Nemotron 3 Super is text-only).

**Notes:** Nemotron is a reasoning model; Nebius treats `response_format: json_schema` as a hint,
so the planner describes the JSON shape in-prompt and rescue-parses off-schema replies.

**Prize writeup:** Nemotron (via Nebius Token Factory) is the agent brain that turns a
natural-language goal into a replayable UI flow — every demo video Diffender produces is planned by Nemotron.
