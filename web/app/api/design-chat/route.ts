/**
 * POST /api/design-chat
 *
 * Reasons over a project's EXTRACTED design system to answer a design intent:
 * which existing tokens/components satisfy it vs which conflict.
 *
 * The web app has no AI SDK of its own, so — per the engine's design — this
 * route shells out to the mcp-server helper `cli-design-chat.ts` via `npx tsx`.
 * That helper reuses `selectModel()` and the provider keys in
 * `mcp-server/.env`, keeping secrets out of the web bundle and tracked source.
 *
 * Body: { intent: string, projectId: string }
 * 200:  { answer: { rationale, satisfies[], conflicts[] } }
 * 4xx/5xx: { error: string }
 */

import { spawn } from "node:child_process";
import path from "node:path";

import { getDsProjectById } from "@/lib/design-systems";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Resolve the engine dir relative to the web app (siblings under drift/). */
function mcpServerDir(): string {
  return path.resolve(process.cwd(), "..", "mcp-server");
}

function runHelper(input: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const cwd = mcpServerDir();
    const child = spawn("npx", ["--yes", "tsx", "src/cli-design-chat.ts"], {
      cwd,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 55_000);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: stderr + String(err) });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

export async function POST(req: Request) {
  let body: { intent?: unknown; projectId?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const intent = typeof body.intent === "string" ? body.intent.trim() : "";
  const projectId = typeof body.projectId === "string" ? body.projectId : "";

  if (!intent) {
    return Response.json({ error: "Describe a design intent first." }, { status: 400 });
  }

  const project = getDsProjectById(projectId);
  if (!project || !project.ds) {
    return Response.json(
      { error: "This project has no extracted design system to reason over." },
      { status: 404 },
    );
  }

  const input = JSON.stringify({ intent, system: project.ds });
  const { code, stdout, stderr } = await runHelper(input);

  if (code !== 0) {
    // Surface a clean message; the raw stderr often names a missing key.
    const hint = /No VLM API key/.test(stderr)
      ? "The design engine has no API key configured (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY in mcp-server/.env)."
      : "The design engine failed to answer.";
    return Response.json({ error: hint }, { status: 502 });
  }

  try {
    const answer = JSON.parse(stdout);
    if (answer.error) {
      return Response.json({ error: String(answer.error) }, { status: 502 });
    }
    return Response.json({ answer });
  } catch {
    return Response.json({ error: "Malformed engine response." }, { status: 502 });
  }
}
