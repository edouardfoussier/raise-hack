/**
 * Scenario — PROTOTYPE "repo → video" brick.
 *
 *   local repo dir  →  serve it on localhost  →  AI plan  →  captioned replay
 *   →  branded intro/outro  →  final.mp4  →  tear the server down.
 *
 * Reuses the existing pipeline UNCHANGED (agentFlow / recordLiveFlow /
 * composeVideo) — this file only adds the "repo → URL" step in front.
 *
 *   REPO_DIR=../sample-app REPO_ENTRY=flow.html \
 *   REPO_GOAL="Sign up: start onboarding, fill name+email, continue" \
 *   npx tsx src/cli-repo.ts
 *
 * Env:
 *   REPO_DIR    — path to the repo/app to demo (required)
 *   REPO_GOAL   — natural-language goal for the AI planner (required)
 *   REPO_ENTRY  — entry page for static repos (default: index.html, else first *.html)
 *   REPO_PORT   — force a port (default: OS-assigned free port)
 *   REPO_TITLE  — intro brand word (default "Scenario")
 *   REPO_CTA    — outro call-to-action (default "Try it → getscenar.io")
 *
 * How the repo is served (detection order):
 *   1. package.json with a "dev" or "start" script  → `npm run <script>` child
 *      process (PORT env forced; `--port --strictPort` appended for Vite),
 *      then poll http://localhost:<port> until it answers (90 s budget).
 *   2. otherwise, any *.html in the dir              → tiny in-process static
 *      file server (node:http) — zero extra deps, instant readiness,
 *      teardown is just server.close().
 */
import "./env.js";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import fs from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import { generateText, Output } from "ai";
import { z } from "zod";
import { agentFlow } from "./planner.js";
import { recordLiveFlow, type FlowStep } from "./flow.js";
import { selectPlannerModel } from "./providers.js";
import { composeVideo } from "./compose.js";

// ── Env ─────────────────────────────────────────────────────────────────────
const REPO_DIR = process.env.REPO_DIR;
const GOAL = process.env.REPO_GOAL;
const TITLE = process.env.REPO_TITLE || "Scenario";
const CTA = process.env.REPO_CTA || "Try it → getscenar.io";
const BRAND = "#FF5A1F";

if (!REPO_DIR) fail("REPO_DIR is required (path to the repo to demo).");
if (!GOAL) fail("REPO_GOAL is required (what the demo should show).");
const repoDir = path.resolve(process.cwd(), REPO_DIR!);
if (!fs.existsSync(repoDir)) fail(`REPO_DIR does not exist: ${repoDir}`);

function fail(msg: string): never {
  console.error("✗ " + msg);
  process.exit(1);
}

// ── repo → URL ──────────────────────────────────────────────────────────────

interface Served {
  url: string;
  kind: "static" | "dev-server";
  stop: () => Promise<void>;
}

/** Ask the OS for a free port. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(p));
    });
    s.on("error", reject);
  });
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

/** Serve a directory of plain files with a tiny in-process node:http server. */
async function serveStatic(dir: string, port: number): Promise<Served> {
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
      let rel = urlPath.replace(/^\/+/, "") || "index.html";
      let file = path.resolve(dir, rel);
      if (!file.startsWith(dir)) {
        res.writeHead(403).end("forbidden");
        return;
      }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!fs.existsSync(file)) {
        res.writeHead(404).end("not found");
        return;
      }
      res.writeHead(200, { "content-type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  // Entry page: REPO_ENTRY > index.html > first *.html in the dir.
  let entry = process.env.REPO_ENTRY;
  if (!entry) {
    if (fs.existsSync(path.join(dir, "index.html"))) entry = "index.html";
    else entry = fs.readdirSync(dir).find((f) => f.endsWith(".html"));
  }
  if (!entry) throw new Error(`no HTML entry page found in ${dir} (set REPO_ENTRY)`);

  return {
    url: `http://127.0.0.1:${port}/${entry}`,
    kind: "static",
    stop: () => new Promise((r) => server.close(() => r())),
  };
}

/** Poll a URL until it answers (any HTTP status = the server is up). */
async function waitForHttp(url: string, timeoutMs: number, logs: () => string): Promise<void> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`dev server did not answer on ${url} within ${timeoutMs / 1000}s.\n--- captured output ---\n${logs()}`);
}

/** Spawn the repo's own dev server (`npm run dev|start`) and wait for the port. */
async function serveDev(dir: string, pkg: any, port: number): Promise<Served> {
  const script = pkg.scripts?.dev ? "dev" : "start";

  // Install deps if missing (first run on a fresh clone).
  if (!fs.existsSync(path.join(dir, "node_modules"))) {
    console.log("  · node_modules missing — running npm install (may take a while)…");
    await new Promise<void>((resolve, reject) => {
      const c = spawn("npm", ["install", "--no-audit", "--no-fund"], { cwd: dir, stdio: "inherit" });
      c.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`npm install exited ${code}`))));
    });
  }

  // Force a known port instead of scraping stdout. Vite ignores PORT → pass flags.
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const args = ["run", script];
  if (deps?.vite) args.push("--", "--port", String(port), "--strictPort");

  const buf: string[] = [];
  const child: ChildProcess = spawn("npm", args, {
    cwd: dir,
    detached: true, // own process group → we can kill the whole tree
    env: { ...process.env, PORT: String(port), BROWSER: "none", CI: "true" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const keep = (d: Buffer) => {
    buf.push(d.toString());
    if (buf.length > 200) buf.shift();
  };
  child.stdout?.on("data", keep);
  child.stderr?.on("data", keep);

  const url = `http://localhost:${port}/`;
  console.log(`  · spawned \`npm run ${script}\` (pid ${child.pid}), waiting for ${url} …`);
  try {
    await waitForHttp(url, 90_000, () => buf.join(""));
  } catch (e) {
    try { process.kill(-child.pid!, "SIGKILL"); } catch { /* already gone */ }
    throw e;
  }

  return {
    url,
    kind: "dev-server",
    stop: async () => {
      // Kill the entire process group — dev servers fork children that outlive
      // a plain child.kill().
      try { process.kill(-child.pid!, "SIGTERM"); } catch { /* already gone */ }
      await new Promise((r) => setTimeout(r, 800));
      try { process.kill(-child.pid!, "SIGKILL"); } catch { /* already gone */ }
    },
  };
}

/** Detect how to serve the repo and bring it up on localhost. */
async function serveRepo(dir: string): Promise<Served> {
  const port = process.env.REPO_PORT ? Number(process.env.REPO_PORT) : await freePort();
  const pkgPath = path.join(dir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.scripts?.dev || pkg.scripts?.start) {
      console.log(`⧗ package.json with "${pkg.scripts?.dev ? "dev" : "start"}" script → spawning dev server on :${port}`);
      return serveDev(dir, pkg, port);
    }
  }
  console.log(`⧗ no runnable package.json → static file server on :${port}`);
  return serveStatic(dir, port);
}

// ── captions (same approach as cli-demo.ts) ─────────────────────────────────

function describe(s: FlowStep): string {
  switch (s.action) {
    case "click": return `click ${s.selector}`;
    case "type": return `type "${s.text}" into ${s.selector}`;
    case "hover": return `hover ${s.selector}`;
    case "move": return `move to ${s.selector}`;
    case "scroll": return `scroll${s.selector ? " to " + s.selector : ""}`;
    case "wait": return "wait";
    case "caption": return `caption "${s.text}"`;
  }
}

function isMeaningful(s: FlowStep): boolean {
  return s.action === "click" || s.action === "type" || s.action === "hover";
}

function fallbackCaption(s: FlowStep): string {
  switch (s.action) {
    case "type": return "Fill in the details";
    case "click": return "Continue";
    case "hover": return "Explore the interface";
    default: return "Next step";
  }
}

async function writeCaptions(goal: string, meaningful: FlowStep[]): Promise<string[]> {
  const CaptionSchema = z.object({
    captions: z.array(z.string()).describe(
      "One concise English caption per numbered step, in the SAME order. Each ≤ 8 words, present tense. No numbering, no quotes.",
    ),
  });
  const numbered = meaningful.map((s, i) => `${i + 1}. ${describe(s)}`).join("\n");
  let raw: string[] = [];
  try {
    const { output } = await generateText({
      model: selectPlannerModel(),
      maxOutputTokens: 2048,
      providerOptions: { nebius: { reasoningEffort: "low" } },
      system:
        "You narrate a product demo video. Given the GOAL and the ordered UI steps, write ONE short caption per step (≤ 8 words, plain English, one-to-one with the steps in order). " +
        'Reply with a single JSON object: {"captions": string[]}.',
      output: Output.object({ schema: CaptionSchema }),
      prompt: `GOAL: ${goal}\n\nSTEPS (write exactly ${meaningful.length} captions, one per step, in order):\n${numbered}`,
    });
    raw = (output as z.infer<typeof CaptionSchema>).captions ?? [];
  } catch {
    console.log("  ⚠ caption LLM call failed — using deterministic captions");
  }
  return meaningful.map((s, i) => raw[i]?.trim() || fallbackCaption(s));
}

// ── main: repo → URL → plan → record → compose → teardown ──────────────────

async function main(): Promise<void> {
  const cacheDir = path.resolve(process.cwd(), "..", ".drift-cache", "repo");

  console.log(`⧗ serving repo: ${repoDir}`);
  const served = await serveRepo(repoDir);
  console.log(`✓ up (${served.kind}): ${served.url}\n`);

  try {
    // A — PLAN (existing planner, unchanged)
    console.log(`⧗ planning flow for goal:\n  "${GOAL}"\n  on: ${served.url}\n`);
    const steps = await agentFlow({
      url: served.url,
      goal: GOAL!,
      maxSteps: 10,
      onStep: (m) => console.log("  ·", m),
    });
    console.log(`\n✓ AI-generated ${steps.length} steps.`);
    if (steps.length === 0) throw new Error("planner produced no steps — cannot build a demo.");

    // B — CAPTIONS (one LLM call, deterministic fallback)
    const meaningful = steps.filter(isMeaningful);
    console.log(`\n⧗ writing ${meaningful.length} captions…`);
    const captions = await writeCaptions(GOAL!, meaningful);
    captions.forEach((c, i) => console.log(`   ${i + 1}. ${c}`));

    const captioned: FlowStep[] = [];
    let ci = 0;
    for (const s of steps) {
      if (isMeaningful(s)) captioned.push({ action: "caption", text: captions[ci++] });
      captioned.push(s);
    }

    // C — REPLAY (existing recorder, unchanged)
    const webm = path.join(cacheDir, "repo-demo.webm");
    console.log(`\n⧗ recording captioned replay → ${webm}`);
    await recordLiveFlow({
      url: served.url,
      steps: captioned,
      captions: true,
      outWebm: webm,
      viewport: { width: 760, height: 560 },
    });
    console.log("✓ replay recorded.");

    // D — COMPOSE (existing compositor, unchanged)
    console.log(`\n⧗ composing intro/outro cards…`);
    const result = await composeVideo({
      inputVideo: webm,
      title: TITLE,
      subtitle: "AI-generated demo — straight from the repo",
      cta: CTA,
      url: "getscenar.io",
      brand: BRAND,
      outDir: path.join(cacheDir, "composed"),
    });

    console.log(`\n✅ done — ${result.totalSeconds.toFixed(1)}s @ ${result.width}×${result.height}`);
    console.log(`   mp4: ${result.mp4Path}`);
    console.log(`   gif: ${result.gifPath}`);
  } finally {
    // E — TEARDOWN, always.
    console.log("\n⧗ stopping server…");
    await served.stop();
    console.log("✓ server stopped.");
  }
}

main().catch((e) => {
  console.error("\n✗ repo demo failed:", (e as Error).message);
  process.exit(1);
});
