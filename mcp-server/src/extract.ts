/**
 * Scenario — shared "extract a design system from a URL" core.
 *
 * Drives a headless browser over a URL via `npx dembrandt --save-output`,
 * finds the JSON it writes, and turns it into a plain-text design-system
 * summary. Used by both the CLI (src/cli-extract.ts) and the MCP tool
 * (`extract_design_system` in src/index.ts) so they stay in lockstep.
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export interface ExtractResult {
  ok: boolean;
  url: string;
  jsonPath?: string;
  summary?: string;
  counts?: { colors: number; textStyles: number; breakpoints: number; components: number };
  error?: string;
}

/** Normalize a bare domain ("thesphinx.ai") into a full URL. */
export function normalizeUrl(input: string): string {
  return /^https?:\/\//i.test(input) ? input : `https://${input}`;
}

/** Run `npx --yes dembrandt <url> --save-output`; resolve with exit code + tail. */
export function runDembrandt(
  url: string,
  opts: { cwd: string; dark?: boolean; slow?: boolean; onOutput?: (chunk: string) => void } = { cwd: process.cwd() },
): Promise<{ code: number; tail: string }> {
  const args = ["--yes", "dembrandt", url, "--save-output"];
  if (opts.dark) args.push("--dark-mode");
  if (opts.slow) args.push("--slow");

  return new Promise((resolve, reject) => {
    const child = spawn("npx", args, {
      cwd: opts.cwd,
      env: { ...process.env, BROWSER: "none", CI: "true" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const buf: string[] = [];
    const keep = (d: Buffer) => {
      const s = d.toString();
      opts.onOutput?.(s);
      buf.push(s);
      if (buf.length > 400) buf.shift();
    };
    child.stdout?.on("data", keep);
    child.stderr?.on("data", keep);
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 0, tail: buf.join("") }));
  });
}

/** Find the most recently written JSON under <cwd>/output/<domain>/ for this URL. */
export function findLatestJson(url: string, cwd: string): string | null {
  const outRoot = path.resolve(cwd, "output");
  if (!existsSync(outRoot)) return null;
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    /* keep empty → scan all */
  }
  const domainDir = host ? path.join(outRoot, host) : "";
  const dirs =
    domainDir && existsSync(domainDir)
      ? [domainDir]
      : readdirSync(outRoot)
          .map((d) => path.join(outRoot, d))
          .filter((p) => statSync(p).isDirectory());
  const candidates: string[] = [];
  for (const dir of dirs) {
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".json")) candidates.push(path.join(dir, f));
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return candidates[0];
}

/** rgb()/rgba() → #rrggbb (best-effort; leaves already-hex/normalized values alone). */
export function toHex(color: string | undefined, normalized?: string): string {
  if (normalized) return normalized;
  if (!color) return "?";
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (!m) return color;
  const [r, g, b] = m[1].split(",").map((n) => Math.round(parseFloat(n)));
  if ([r, g, b].some((n) => Number.isNaN(n))) return color;
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}

/** Count concrete component instances across dembrandt's mixed shapes. */
export function countComponents(components: any): { total: number; byKind: Record<string, number> } {
  const byKind: Record<string, number> = {};
  let total = 0;
  const add = (kind: string, n: number) => {
    if (n <= 0) return;
    byKind[kind] = (byKind[kind] ?? 0) + n;
    total += n;
  };
  for (const [kind, val] of Object.entries(components ?? {})) {
    if (Array.isArray(val)) {
      add(kind, val.length); // e.g. buttons, links
    } else if (val && typeof val === "object") {
      // e.g. inputs: { text:[], checkbox:[] }  ·  badges: { all:[], byVariant:{} }
      let n = 0;
      for (const [sub, arr] of Object.entries(val as Record<string, unknown>)) {
        if (Array.isArray(arr) && sub !== "byVariant") n += arr.length;
      }
      add(kind, n);
    }
  }
  return { total, byKind };
}

/**
 * Build the design-system summary from a parsed dembrandt JSON.
 * `style` controls decoration: "ansi" for the terminal, "plain" for MCP/text.
 */
export function buildSummary(
  json: any,
  jsonPath: string,
  fallbackUrl: string,
  style: "ansi" | "plain" = "plain",
): { text: string; counts: NonNullable<ExtractResult["counts"]> } {
  const ansi = style === "ansi";
  const bold = (s: string) => (ansi ? `\x1b[1m${s}\x1b[0m` : s);
  const dim = (s: string) => (ansi ? `\x1b[2m${s}\x1b[0m` : s);
  const out: string[] = [];
  const line = (s = "") => out.push(s);

  const site = json.siteName || json.url || fallbackUrl;
  const version = json.meta?.dembrandtVersion ? ` · dembrandt ${json.meta.dembrandtVersion}` : "";

  line(bold(`Design system extracted from ${site}`));
  line(dim(`${json.url || fallbackUrl}${version}`));
  line(dim(`source: ${jsonPath}`));

  // ── Brand colors (hex + role) ──
  const palette: any[] = Array.isArray(json.colors?.palette) ? json.colors.palette : [];
  line();
  line(bold(`Brand colors`) + dim(`  (${palette.length})`));
  for (const [role, val] of Object.entries(json.colors?.semantic ?? {})) {
    line(`  ${dim("semantic")}  ${toHex(val as string).padEnd(9)} ${role}`);
  }
  for (const c of palette.slice(0, 8)) {
    const hex = toHex(c.color, c.normalized).padEnd(9);
    const role = c.role || c.confidence || "";
    const hover = c.hover ? dim(` hover ${c.hover}`) : "";
    line(`  ${hex} ${role}${hover}`);
  }

  // ── Typography (families + sizes) ──
  const styles: any[] = Array.isArray(json.typography?.styles) ? json.typography.styles : [];
  const families = [...new Set(styles.map((s) => s.family).filter(Boolean))];
  const sizes = [
    ...new Set(
      styles.map((s) => (typeof s.size === "string" ? s.size.split(" ")[0] : null)).filter((s): s is string => !!s),
    ),
  ].sort((a, b) => parseFloat(b) - parseFloat(a));
  line();
  line(bold(`Typography`) + dim(`  (${styles.length} text styles)`));
  line(`  ${dim("families")}  ${families.length ? families.join(", ") : "—"}`);
  line(`  ${dim("scale")}     ${sizes.length ? sizes.join("  ") : "—"}`);
  for (const s of styles.slice(0, 4)) {
    const size = typeof s.size === "string" ? s.size.split(" ")[0] : "?";
    line(`  ${dim("·")} ${(s.context || "text").padEnd(12)} ${s.family || "?"} ${size} ${dim(String(s.weight ?? ""))}`);
  }

  // ── Spacing ──
  const spacing: any[] = Array.isArray(json.spacing?.commonValues) ? json.spacing.commonValues : [];
  const spaceVals = spacing
    .slice()
    .sort((a, b) => (a.numericValue ?? 0) - (b.numericValue ?? 0))
    .map((s) => s.display || s.px)
    .filter(Boolean);
  line();
  line(bold(`Spacing`) + dim(`  (${json.spacing?.scaleType || "scale"})`));
  line(`  ${spaceVals.slice(0, 12).join("  ") || "—"}`);

  // ── Motion tokens ──
  const durations: any[] = Array.isArray(json.motion?.durations) ? json.motion.durations : [];
  const easings: any[] = Array.isArray(json.motion?.easings) ? json.motion.easings : [];
  line();
  line(bold(`Motion`));
  line(`  ${dim("durations")} ${durations.map((d) => d.value).join("  ") || "—"}`);
  line(`  ${dim("easings")}   ${easings.map((e) => e.type || e.value).slice(0, 5).join("  ") || "—"}`);

  // ── Breakpoints ──
  const bps: any[] = Array.isArray(json.breakpoints) ? json.breakpoints : [];
  const bpVals = bps.map((b) => b.px || b).filter(Boolean);
  line();
  line(bold(`Breakpoints`) + dim(`  (${bpVals.length})`));
  line(`  ${bpVals.join(" → ") || "—"}`);

  // ── Components ──
  const { total, byKind } = countComponents(json.components);
  const breakdown = Object.entries(byKind)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ");
  line();
  line(bold(`Components`) + dim(`  (${total})`));
  line(`  ${breakdown || "—"}`);

  // ── One-line headline the agent can echo ──
  line();
  line(bold("✓ ") + `${palette.length} colors · ${styles.length} text styles · ${bpVals.length} breakpoints · ${total} components`);
  line(dim("This is your app's live design system in Scenario. Edit a component, then /drift to review it against these tokens."));

  return {
    text: out.join("\n"),
    counts: { colors: palette.length, textStyles: styles.length, breakpoints: bpVals.length, components: total },
  };
}

/**
 * End-to-end: extract a URL and return a plain-text summary (never throws).
 * Suitable for the MCP tool. The CLI uses the lower-level helpers directly so
 * it can stream dembrandt's live progress with ANSI decoration.
 */
export async function extractDesignSystem(
  rawUrl: string,
  opts: { cwd: string; dark?: boolean; slow?: boolean } = { cwd: process.cwd() },
): Promise<ExtractResult> {
  const url = normalizeUrl(rawUrl);
  let code = 0;
  try {
    ({ code } = await runDembrandt(url, opts));
  } catch (e) {
    return {
      ok: false,
      url,
      error: `Could not launch dembrandt (${(e as Error).message}). Check network / npx registry access and retry.`,
    };
  }

  const jsonPath = findLatestJson(url, opts.cwd);
  if (!jsonPath || !existsSync(jsonPath)) {
    return {
      ok: false,
      url,
      error:
        `Extraction did not produce a design-system JSON for ${url}. ` +
        `The site likely blocked automated access, timed out, or served no styles. ` +
        `Try again with slow=true, or extract a different page.`,
    };
  }

  let json: any;
  try {
    json = JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch (e) {
    return { ok: false, url, jsonPath, error: `Extracted file was not valid JSON (${(e as Error).message}).` };
  }

  const { text, counts } = buildSummary(json, jsonPath, url, "plain");
  const note = code !== 0 ? `\n\n(dembrandt exited ${code}, but a JSON was produced and parsed.)` : "";
  return { ok: true, url, jsonPath, summary: text + note, counts };
}
