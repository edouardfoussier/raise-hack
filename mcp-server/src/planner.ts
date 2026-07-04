import { chromium, devices, type Page } from "playwright";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { selectPlannerModel } from "./providers.js";
import type { FlowStep } from "./flow.js";

/**
 * AI flow planner (Stagehand-style, DOM-based — NOT computer-use).
 * Drives the app one step at a time toward a natural-language goal, and returns
 * a concrete FlowStep[] that can then be REPLAYED deterministically (plan-once →
 * replay on before AND after for a fair comparison).
 */

const DecisionSchema = z.object({
  done: z.boolean().describe("true when the goal is fully accomplished; then no action is needed."),
  action: z.enum(["click", "type", "hover"]).optional(),
  selector: z.string().optional().describe("A selector copied verbatim from the element list."),
  text: z.string().optional().describe("Text to type (only for action='type')."),
  reason: z.string().describe("One short sentence on why this is the next step."),
});

type Decision = z.infer<typeof DecisionSchema>;

/**
 * Rescue parse for models whose provider does not enforce the JSON schema
 * server-side (e.g. Nemotron on Nebius treats response_format as a hint):
 * extract the JSON object from the raw text and normalize near-miss shapes.
 */
function extractDecision(text: string): Decision | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let raw: any;
  try {
    raw = JSON.parse(m[0]);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  // Tolerate a nested {"action": {"type": "click", "selector": "…"}} shape.
  if (raw.action && typeof raw.action === "object") {
    const a = raw.action;
    raw = { ...raw, action: a.type ?? a.action, selector: raw.selector ?? a.selector, text: raw.text ?? a.text };
  }
  if (raw.done == null) raw.done = false;
  if (raw.reason == null) raw.reason = "(no reason given)";
  const parsed = DecisionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

interface El {
  selector: string;
  kind: string;
  label: string;
}

async function digest(page: Page): Promise<El[]> {
  return page.$$eval("button, a[href], input, select, textarea, [role=button]", (nodes) =>
    (nodes as HTMLElement[])
      .filter((el) => el.offsetParent !== null)
      .slice(0, 45)
      .map((el) => {
        const tag = el.tagName.toLowerCase();
        const id = el.id;
        const ph = el.getAttribute("placeholder");
        const label = (
          el.innerText ||
          (el as HTMLInputElement).value ||
          el.getAttribute("aria-label") ||
          (ph ? `empty field — placeholder: ${ph}` : "")
        )
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 45);
        let selector = "";
        if (id) selector = "#" + id;
        else if ((tag === "input" || tag === "textarea") && ph) selector = `[placeholder="${ph}"]`;
        else if (label) selector = `${tag}:has-text(${JSON.stringify(label)})`;
        const kind = tag === "input" || tag === "textarea" || tag === "select" ? "field" : "control";
        return { selector, kind, label };
      })
      .filter((e) => e.selector),
  );
}

export interface AgentFlowInput {
  url: string;
  goal: string;
  device?: string;
  initScript?: string;
  readOnly?: boolean;
  maxSteps?: number;
  onStep?: (msg: string) => void;
}

export async function agentFlow(input: AgentFlowInput): Promise<FlowStep[]> {
  const browser = await chromium.launch();
  const steps: FlowStep[] = [];
  const history: string[] = [];
  try {
    const dev = input.device ? devices[input.device] : undefined;
    const context = await browser.newContext(dev ?? { viewport: { width: 420, height: 860 } });
    if (input.readOnly) {
      await context.route("**/api/**", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
    }
    if (input.initScript) await context.addInitScript(input.initScript);
    const page = await context.newPage();
    await page.goto(input.url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);

    // Planning is text-only → NVIDIA Nemotron (via Nebius Token Factory) when available.
    const model = selectPlannerModel();
    const max = input.maxSteps ?? 12;
    for (let i = 0; i < max; i++) {
      const els = await digest(page);
      let output: Decision | undefined;
      for (let attempt = 0; attempt < 2 && !output; attempt++) {
        try {
          const res = await generateText({
            model,
            maxOutputTokens: 2048, // reasoning models (Nemotron) think before the JSON
            providerOptions: { nebius: { reasoningEffort: "low" } },
            system:
              "You drive a web app to accomplish a GOAL, ONE step at a time. Given the current interactable elements (each with a ready selector) and the actions already taken, choose the single next action. Use a selector verbatim from the list. Prefer clicking a primary CTA to advance; fill fields the goal mentions. " +
              'A label like "empty field — placeholder: …" means that field is EMPTY (a placeholder is NOT a value): type into every field the goal mentions before continuing. Set done=true ONLY when NOTHING remains to do — if any click or input is still required (e.g. a final Continue/Submit), return that action with done=false instead. ' +
              'Reply with a single FLAT JSON object of exactly this shape: {"done": boolean, "action": "click"|"type"|"hover", "selector": string, "text": string, "reason": string} — "action" is a plain string, never a nested object; omit "action"/"selector" only when done=true.',
            output: Output.object({ schema: DecisionSchema }),
            prompt: `GOAL: ${input.goal}\n\nACTIONS TAKEN:\n${history.join("\n") || "(none)"}\n\nCURRENT ELEMENTS (selector — kind — label):\n${els.map((e) => `- ${e.selector}  —  ${e.kind}  —  "${e.label}"`).join("\n")}`,
          });
          output = res.output;
        } catch (e) {
          // Some providers (Nemotron on Nebius) don't enforce response_format
          // server-side; rescue the decision from the raw text when possible.
          const rescued = NoObjectGeneratedError.isInstance(e) && e.text ? extractDecision(e.text) : undefined;
          if (rescued) output = rescued;
          else if (attempt === 0) input.onStep?.("⚠ unusable model response — retrying step");
          else throw e;
        }
      }
      if (!output) throw new Error("planner: no decision produced");

      if (output.done || !output.action || !output.selector) {
        input.onStep?.(`done: ${output.reason}`);
        break;
      }
      const loc = page.locator(output.selector).first();
      try {
        if (output.action === "type") {
          await loc.click();
          await loc.fill(output.text ?? "");
          steps.push({ action: "type", selector: output.selector, text: output.text ?? "" });
          history.push(`typed "${output.text}" into ${output.selector}`);
        } else if (output.action === "click") {
          await loc.click();
          steps.push({ action: "click", selector: output.selector });
          steps.push({ action: "wait", ms: 800 });
          history.push(`clicked ${output.selector}`);
        } else {
          await loc.hover();
          steps.push({ action: "hover", selector: output.selector, dwell: 700 });
          history.push(`hovered ${output.selector}`);
        }
        input.onStep?.(`${output.action} ${output.selector} — ${output.reason}`);
        await page.waitForTimeout(700);
      } catch (e) {
        history.push(`(failed ${output.action} ${output.selector}: ${(e as Error).message.split("\n")[0]})`);
        input.onStep?.(`⚠ failed ${output.action} ${output.selector}`);
      }
    }
    await browser.close();
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
  return steps;
}
