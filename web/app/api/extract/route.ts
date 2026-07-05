/**
 * POST /api/extract
 *
 * Live design-system extraction: given a URL, shell out to dembrandt
 * (`npx --yes dembrandt <url> --save-output`), read the JSON it writes, and
 * normalize it into the same DesignSystem shape the seed projects use. The
 * client then persists the returned project in its edit store.
 *
 * Body: { url: string }
 * 200:  { project: DsProject }   (status: "extracted")
 * 4xx/5xx: { error: string }
 */

import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  normalizeDesignSystem,
  tokenCount,
  type DsProject,
} from "@/lib/design-systems";

export const runtime = "nodejs";
export const maxDuration = 120;

function normalizeUrl(raw: string): string | null {
  let u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function slugFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  } catch {
    return `site_${Date.now()}`;
  }
}

function runDembrandt(
  url: string,
  outDir: string,
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      "npx",
      ["--yes", "dembrandt", url, "--save-output", "--output-dir", outDir],
      { env: process.env },
    );
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), 110_000);
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.stdout.on("data", () => {});
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: 1, stderr: stderr + String(err) });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stderr });
    });
  });
}

/** Find the newest *.json dembrandt wrote anywhere under `dir` (it nests by host). */
async function findLatestJson(dir: string): Promise<string | null> {
  const found: string[] = [];
  async function walk(d: string) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name.endsWith(".json")) found.push(full);
    }
  }
  await walk(dir);
  if (!found.length) return null;
  // Filenames are ISO-timestamp prefixed, so lexical sort == chronological.
  found.sort();
  return found[found.length - 1];
}

export async function POST(req: Request) {
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url = normalizeUrl(typeof body.url === "string" ? body.url : "");
  if (!url) {
    return Response.json({ error: "Enter a valid http(s) URL." }, { status: 400 });
  }

  let outDir: string;
  try {
    outDir = await mkdtemp(path.join(tmpdir(), "scenario-extract-"));
  } catch {
    return Response.json({ error: "Couldn't create a work directory." }, { status: 500 });
  }

  const { code, stderr } = await runDembrandt(url, outDir);

  const jsonPath = await findLatestJson(outDir);
  if (!jsonPath) {
    const hint =
      code !== 0
        ? "dembrandt couldn't extract this site (it may block automated access or be gated)."
        : "Extraction produced no output.";
    return Response.json({ error: hint, detail: stderr.slice(-400) }, { status: 502 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(jsonPath, "utf8"));
  } catch {
    return Response.json({ error: "Couldn't parse the extraction output." }, { status: 502 });
  }

  const slug = slugFromUrl(url);
  const projectId = `prj_${slug}`;
  const ds = normalizeDesignSystem(raw as Record<string, unknown>, projectId);

  const project: DsProject = {
    id: projectId,
    name: ds.siteName || slug,
    url: ds.url || url,
    thumbnailColor: ds.colors[0]?.hex ?? "#ff5a1f",
    description: `Design system extracted live from ${ds.url || url}.`,
    status: "extracted",
    ds,
    note:
      tokenCount(ds) < 8
        ? "Thin extraction — this site surfaced few DOM-level tokens (it may render most of its UI to a canvas)."
        : undefined,
  };

  return Response.json({ project });
}
