import { spawn } from "node:child_process";
import { mkdir, copyFile, access } from "node:fs/promises";
import path from "node:path";

/**
 * POST /api/generate — the LIVE "Generate demo" endpoint.
 *
 * Accepts { url, goal, captions, voice } and drives the Scenario engine
 * (mcp-server/src/cli-demo.ts) end-to-end:
 *
 *   goal + URL → AI plan → captioned deterministic replay → intro/outro
 *              → (optional) Gradium voice-over → final.mp4
 *
 * The finished mp4 (and gif) are copied into web/public/generated/<id>.* so the
 * browser can play them back. This is a long job (~1–2 min) — intended for local
 * dev, not serverless. Secrets live in web/.env.local (never hardcoded here).
 */

// This route shells out to the engine and writes to the filesystem — it must run
// on the Node.js runtime, never the Edge runtime.
export const runtime = "nodejs";
// Give the long-running engine room (Next dev ignores this; set for parity).
export const maxDuration = 300;

type GenerateBody = {
  url?: string;
  goal?: string;
  captions?: boolean;
  voice?: boolean;
  /**
   * Edited narration from the wizard — ONE LINE PER STEP (newline-separated).
   * When present it replaces the auto-generated per-step lines; the total length
   * still adapts to the flow (audio-driven).
   */
  script?: string;
  /**
   * Chosen Gradium voice id. The seed "Edouard (cloned)" voice sends the sentinel
   * "default" (or nothing), meaning "use the server's configured GRADIUM_VOICE_ID".
   */
  voiceId?: string;
  /** Render device: "mobile" (iPhone 13 portrait + touch) or "desktop". */
  device?: "mobile" | "desktop";
};

/** Repo root = one level above web/ (Next dev cwd), overridable for other setups. */
function repoRoot(): string {
  return process.env.SCENARIO_REPO_ROOT?.trim() || path.resolve(process.cwd(), "..");
}

/** JSON error helper. */
function fail(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

/**
 * When the target is the configured deja-bu preview (behind Vercel SSO + an
 * app-level password), return the extra env the engine needs to reach the real
 * app: the protection-bypass header and a localStorage auth-token seed. The
 * token MUST be JSON-encoded — that is exactly how the app persists it.
 */
function dejaEnv(targetUrl: string): Record<string, string> {
  const dejaUrl = process.env.DEJA_URL?.trim();
  const bypass = process.env.DEJA_BYPASS?.trim();
  const pwd = process.env.DEJA_PWD?.trim();
  if (!dejaUrl || !bypass || !pwd) return {};

  // Match by host so any path on the preview is covered.
  let sameHost = false;
  try {
    sameHost = new URL(targetUrl).host === new URL(dejaUrl).host;
  } catch {
    sameHost = false;
  }
  if (!sameHost) return {};

  return {
    DEMO_HEADERS: JSON.stringify({
      "x-vercel-protection-bypass": bypass,
      "x-vercel-set-bypass-cookie": "true",
    }),
    DEMO_INIT: `try { localStorage.setItem("deja-bu:v1:auth-token", JSON.stringify(${JSON.stringify(
      pwd,
    )})); } catch (e) {}`,
    // The deja demo is a READ-ONLY flow — allow GET /api, abort any writes.
    DEMO_READONLY: "1",
  };
}

/** Run the engine CLI; resolve on exit 0, reject with collected stderr otherwise. */
function runEngine(root: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const cli = path.join(root, "mcp-server", "src", "cli-demo.ts");
    // cwd = mcp-server so cli-demo's `../.drift-cache` + `../sample-app` resolve.
    const child = spawn("npx", ["tsx", cli], {
      cwd: path.join(root, "mcp-server"),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let tail = "";
    const keep = (chunk: Buffer) => {
      tail = (tail + chunk.toString()).slice(-4000); // keep the last ~4KB for errors
    };
    child.stdout.on("data", (c) => {
      keep(c);
      process.stdout.write(c); // surface engine progress in the dev server terminal
    });
    child.stderr.on("data", (c) => {
      keep(c);
      process.stderr.write(c);
    });

    child.on("error", (e) => reject(new Error(`failed to spawn engine: ${e.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`engine exited ${code}\n${tail.slice(-1200)}`));
    });
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return fail("invalid JSON body");
  }

  const url = body.url?.trim();
  const goal = body.goal?.trim();
  if (!url) return fail("missing 'url'");
  if (!goal) return fail("missing 'goal'");
  try {
    new URL(url);
  } catch {
    return fail("'url' is not a valid URL");
  }

  const captions = body.captions !== false; // default ON
  const voice = body.voice !== false; // default ON
  // Device: default to mobile (the common case — most demoed apps are mobile).
  const device: "mobile" | "desktop" = body.device === "desktop" ? "desktop" : "mobile";

  const root = repoRoot();
  const id = `gen_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

  // Build the engine environment: inherit the process env (so mcp-server/.env
  // engine keys still load), then layer the per-request demo settings on top.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DEMO_URL: url,
    DEMO_GOAL: goal,
    DEMO_DEVICE: device,
    DEMO_TITLE: process.env.DEMO_TITLE?.trim() || "Scenario",
    ...dejaEnv(url),
  };

  if (voice) {
    env.DEMO_VOICE = "1";
    const serverVoiceId = process.env.GRADIUM_VOICE_ID?.trim();
    if (serverVoiceId) env.GRADIUM_VOICE_ID = serverVoiceId;

    // A chosen voice id from the Assets picker overrides the account default,
    // EXCEPT the "default" sentinel which maps to the seed "Edouard (cloned)"
    // voice (whose real id stays server-side in GRADIUM_VOICE_ID).
    const chosenVoiceId = body.voiceId?.trim();
    if (chosenVoiceId && chosenVoiceId !== "default") {
      env.DEMO_VOICE_ID = chosenVoiceId;
    }

    // The edited voice-over script is narrated verbatim instead of the captions.
    const script = body.script?.trim();
    if (script) env.DEMO_SCRIPT = script;
  } else {
    delete env.DEMO_VOICE;
  }
  // Captions are always rendered by the engine; the flag is reserved for future
  // opt-out. We keep the value in the response for a truthful echo.

  try {
    await runEngine(root, env);
  } catch (e) {
    return fail((e as Error).message || "engine failed", 500);
  }

  // Copy the finished artifacts into web/public/generated/<id>.*
  const composedDir = path.join(root, ".drift-cache", "demo", "composed");
  const srcMp4 = path.join(composedDir, "final.mp4");
  const srcGif = path.join(composedDir, "final.gif");

  try {
    await access(srcMp4);
  } catch {
    return fail("engine finished but no final.mp4 was produced", 500);
  }

  const publicDir = path.join(process.cwd(), "public", "generated");
  await mkdir(publicDir, { recursive: true });
  await copyFile(srcMp4, path.join(publicDir, `${id}.mp4`));

  let gifUrl: string | undefined;
  try {
    await copyFile(srcGif, path.join(publicDir, `${id}.gif`));
    gifUrl = `/generated/${id}.gif`;
  } catch {
    // gif is a nice-to-have; ignore if missing.
  }

  return Response.json({
    id,
    videoUrl: `/generated/${id}.mp4`,
    gifUrl,
    url,
    goal,
    device,
    captions,
    voice,
    voiceId: body.voiceId?.trim() || "default",
    scripted: Boolean(body.script?.trim()),
  });
}
