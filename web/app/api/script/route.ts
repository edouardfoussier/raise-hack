import { spawn } from "node:child_process";
import path from "node:path";

/**
 * POST /api/script — generate a spoken voice-over script for a demo.
 *
 * Accepts { url, goal, durationSec } and returns { script }. It shells out to
 * the engine's script helper (mcp-server/src/cli-script.ts), which reuses the
 * SAME planner model the demo engine uses (Nebius Nemotron when available, else
 * the OpenRouter/Anthropic stack) — so no extra provider config is needed here.
 *
 * The script is sized to be read aloud in ~durationSec seconds (~2.5 words/sec)
 * and returned to the wizard as an editable draft. Secrets live in the engine's
 * env files / web/.env.local — never hardcoded here.
 */

// Shells out to the engine and needs Node APIs — never the Edge runtime.
export const runtime = "nodejs";
export const maxDuration = 120;

type ScriptBody = {
  url?: string;
  goal?: string;
  durationSec?: number;
};

/** Repo root = one level above web/ (Next dev cwd), overridable for other setups. */
function repoRoot(): string {
  return process.env.SCENARIO_REPO_ROOT?.trim() || path.resolve(process.cwd(), "..");
}

function fail(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

/** Run the script helper CLI; resolve with its stdout (the script), reject on non-zero exit. */
function runScriptEngine(root: string, env: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolve, reject) => {
    const cli = path.join(root, "mcp-server", "src", "cli-script.ts");
    const child = spawn("npx", ["tsx", cli], {
      cwd: path.join(root, "mcp-server"),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let out = "";
    let err = "";
    child.stdout.on("data", (c: Buffer) => {
      out += c.toString();
    });
    child.stderr.on("data", (c: Buffer) => {
      err += c.toString();
      process.stderr.write(c); // surface progress/errors in the dev terminal
    });

    child.on("error", (e) => reject(new Error(`failed to spawn script engine: ${e.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(`script engine exited ${code}\n${err.slice(-800)}`));
    });
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: ScriptBody;
  try {
    body = (await request.json()) as ScriptBody;
  } catch {
    return fail("invalid JSON body");
  }

  const goal = body.goal?.trim();
  const url = body.url?.trim() ?? "";
  if (!goal) return fail("missing 'goal'");

  // Clamp duration to a sane window; default 40s.
  const durationSec = Math.max(
    5,
    Math.min(180, Math.round(Number(body.durationSec) || 40)),
  );

  const root = repoRoot();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SCRIPT_GOAL: goal,
    SCRIPT_URL: url,
    SCRIPT_DURATION: String(durationSec),
  };

  try {
    const script = await runScriptEngine(root, env);
    if (!script) return fail("script engine produced no output", 500);
    return Response.json({ script, durationSec });
  } catch (e) {
    return fail((e as Error).message || "script generation failed", 500);
  }
}
