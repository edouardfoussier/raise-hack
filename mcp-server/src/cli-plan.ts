/**
 * Demo the AI flow planner: give it a natural-language GOAL, it drives the app
 * to discover a concrete FlowStep[], then replays it deterministically (with the
 * cursor) to a webm. Proves "the AI generates the flow" — no hand-written selectors.
 *   npx tsx src/cli-plan.ts
 */
import "./env.js";
import path from "node:path";
import { agentFlow } from "./planner.js";
import { recordLiveFlow } from "./flow.js";

// Point at the sample onboarding flow served locally.
const URL = process.env.PLAN_URL || "file://" + path.resolve(process.cwd(), "../sample-app/flow.html");
const GOAL =
  process.env.PLAN_GOAL ||
  "Sign up: start the onboarding, fill the name with 'Ada Lovelace' and the email with 'ada@example.com', then continue to finish.";

console.log(`⧗ planning flow for goal:\n  "${GOAL}"\n`);
const steps = await agentFlow({
  url: URL,
  goal: GOAL,
  maxSteps: 10,
  onStep: (m) => console.log("  ·", m),
});

console.log(`\n✓ AI-generated ${steps.length} steps:`);
console.log(JSON.stringify(steps, null, 2));

console.log("\n⧗ replaying the generated flow deterministically (with cursor) → webm…");
const outDir = path.resolve(process.cwd(), "..", ".drift-cache", "plan");
const { webm } = await recordLiveFlow({
  url: URL,
  steps,
  outWebm: path.join(outDir, "planned.webm"),
  viewport: { width: 760, height: 560 },
});
console.log(`✓ replayed: ${webm}`);
