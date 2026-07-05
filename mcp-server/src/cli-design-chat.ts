/**
 * cli-design-chat — a tiny bridge the Scenario web app shells out to for the
 * design-intent chat (the brief's "example 3").
 *
 * It reuses the engine's model selection (`selectModel` from ./vlm) and the
 * same provider env (`./env` side-effect loads mcp-server/.env), so the web app
 * needs no AI SDK of its own and no keys in tracked source.
 *
 * Protocol: reads ONE JSON object from stdin:
 *   { "intent": string, "system": <normalized DesignSystem> }
 * and prints ONE JSON object to stdout:
 *   { "rationale": string, "satisfies": Match[], "conflicts": Match[] }
 * On failure it prints { "error": string } and exits non-zero.
 */

import "./env.js";
import { generateText, Output } from "ai";
import { z } from "zod";

import { selectModel } from "./vlm.js";

const MatchSchema = z.object({
  token: z
    .string()
    .describe("The exact name of the existing token or component, e.g. 'primary', 'destructive', or 'badge 1'."),
  group: z
    .string()
    .describe("Which part of the system it belongs to: color, typography, spacing, radius, motion, breakpoint, or component."),
  reason: z
    .string()
    .describe("One concise sentence: why this token satisfies or conflicts with the intent, in the system's own terms."),
});

const AnswerSchema = z.object({
  rationale: z
    .string()
    .describe("1-2 sentences of overall reasoning, grounded strictly in the provided extracted design system."),
  satisfies: z.array(MatchSchema).describe("Existing tokens/components that SATISFY the intent. May be empty."),
  conflicts: z
    .array(MatchSchema)
    .describe("Existing tokens/components that CONFLICT with the intent or would cause drift if used. May be empty."),
});

const SYSTEM = `You are a senior design-systems engineer embedded in a product.
You are given a design system that was EXTRACTED FROM A LIVE APP (its colors, typography, spacing, radii, motion, breakpoints and components), and a short DESIGN INTENT from a product designer.

Your job: reason over ONLY the provided system and decide which existing tokens/components SATISFY the intent and which CONFLICT with it (or would cause drift if used for this intent).

Rules:
- Ground every claim in a token that actually appears in the provided system. Never invent a token, hex, or component that is not present.
- Reference tokens by the names present in the data (e.g. a color's role/name, a component's label like "badge 1", a type context like "display").
- Be decisive and concrete. Name the specific color/role/component and say why it fits or clashes with the stated intent (e.g. a destructive CTA needs a red/warning color — if the palette has none, that is a conflict worth stating).
- Keep each reason to one sentence. Keep the overall rationale to 1-2 sentences.
- It is fine for either list to be empty when nothing in the system applies.`;

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const raw = await readStdin();
  let payload: { intent?: string; system?: unknown };
  try {
    payload = JSON.parse(raw);
  } catch {
    process.stdout.write(JSON.stringify({ error: "Invalid JSON on stdin." }));
    process.exit(1);
    return;
  }

  const intent = (payload.intent ?? "").toString().trim();
  if (!intent) {
    process.stdout.write(JSON.stringify({ error: "Missing 'intent'." }));
    process.exit(1);
    return;
  }

  const model = selectModel();
  const systemJson = JSON.stringify(payload.system ?? {}, null, 1).slice(0, 24000);

  const { output } = await generateText({
    model,
    system: SYSTEM,
    output: Output.object({ schema: AnswerSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extracted design system (the source of truth):\n\n${systemJson}`,
          },
          {
            type: "text",
            text: `Design intent to evaluate:\n\n"${intent}"\n\nReturn which existing tokens/components satisfy it vs conflict, with a short rationale.`,
          },
        ],
      },
    ],
  });

  process.stdout.write(JSON.stringify(output));
}

main().catch((err) => {
  process.stdout.write(
    JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
  );
  process.exit(1);
});
