/**
 * Spike: record the full onboarding FLOW with a visible moving cursor.
 *   npx tsx src/cli-flow.ts
 */
import "./env.js";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { recordFlow, type FlowStep } from "./flow.js";

const appDir = path.resolve(process.cwd(), "../sample-app");
const content = await readFile(path.join(appDir, "components.css"), "utf8");
const outDir = path.resolve(process.cwd(), "..", ".drift-cache", "flow");

const steps: FlowStep[] = [
  { action: "hover", selector: "#flow-start", dwell: 700 },
  { action: "click", selector: "#flow-start" },
  { action: "wait", ms: 550 },
  { action: "type", selector: "#flow-name", text: "Ada Lovelace" },
  { action: "type", selector: "#flow-email", text: "ada@example.com" },
  { action: "hover", selector: "#flow-continue", dwell: 400 },
  { action: "click", selector: "#flow-continue" },
  { action: "wait", ms: 900 },
];

console.log("⧗ recording onboarding flow with cursor…");
const webm = await recordFlow({
  appDir,
  previewRel: "flow.html",
  changedRelToApp: "components.css",
  content,
  viewport: { width: 760, height: 560 },
  steps,
  outWebm: path.join(outDir, "flow-spike.webm"),
  verifyShot: path.join(outDir, "flow-verify.png"),
});

const s = await stat(webm);
console.log(`✓ webm: ${webm} (${(s.size / 1024).toFixed(0)} KB)`);
console.log(`✓ verify frame: ${path.join(outDir, "flow-verify.png")}`);
