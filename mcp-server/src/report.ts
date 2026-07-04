import { writeFile } from "node:fs/promises";
import { exec } from "node:child_process";
import type { DriftVerdict } from "./types.js";

export type Visual =
  | { kind: "image"; dataUri: string }
  | { kind: "frames"; dataUris: string[] }
  | { kind: "video"; dataUri: string };

const BADGE: Record<string, { label: string; color: string; bg: string }> = {
  accidental_regression: { label: "Accidental regression", color: "#FCA5A5", bg: "rgba(239,68,68,0.10)" },
  intentional_redesign: { label: "Intentional redesign", color: "#86EFAC", bg: "rgba(34,197,94,0.10)" },
  platform_constraint: { label: "Platform constraint", color: "#FCD34D", bg: "rgba(245,158,11,0.10)" },
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function panel(title: string, v: Visual, id: string): string {
  if (v.kind === "image") {
    return `<figure class="panel"><figcaption>${title}</figcaption>
      <div class="stage"><img src="${v.dataUri}" alt="${title}"/></div></figure>`;
  }
  if (v.kind === "video") {
    return `<figure class="panel"><figcaption>${title} <span class="live">▶ playing</span></figcaption>
      <div class="stage"><video src="${v.dataUri}" autoplay loop muted playsinline></video></div></figure>`;
  }
  const frames = JSON.stringify(v.dataUris);
  return `<figure class="panel"><figcaption>${title} <span class="live">● playing</span></figcaption>
    <div class="stage"><img id="${id}" src="${v.dataUris[0]}" alt="${title}"/></div>
    <script>(function(){var f=${frames};var seq=f.concat(f.slice(1,f.length-1).reverse());var i=0,el=document.getElementById(${JSON.stringify(id)});setInterval(function(){i=(i+1)%seq.length;el.src=seq[i];},110);})();</script></figure>`;
}

export function buildReportHtml(opts: {
  verdict: DriftVerdict;
  filePath: string;
  model: string;
  interaction?: string;
  before: Visual;
  after: Visual;
}): string {
  const b = BADGE[opts.verdict.classification] ?? {
    label: opts.verdict.classification,
    color: "#E5E7EB",
    bg: "rgba(255,255,255,0.06)",
  };
  const conf = Math.round((opts.verdict.confidence ?? 0) * 100);
  const diff = opts.verdict.proposed_diff.trim();
  const diffHtml = diff
    ? `<pre class="diff">${diff
        .split("\n")
        .map((line) => {
          const cls = line.startsWith("+")
            ? "add"
            : line.startsWith("-")
              ? "del"
              : line.startsWith("@@")
                ? "hunk"
                : "";
          return `<span class="${cls}">${escapeHtml(line)}</span>`;
        })
        .join("")}</pre>`
    : `<p class="nofix">✓ On-system — no fix needed.</p>`;
  const modeLabel =
    opts.interaction === "flow"
      ? "user flow"
      : opts.interaction
        ? `motion · ${escapeHtml(opts.interaction)}`
        : "static";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Drift review — ${escapeHtml(opts.filePath)}</title>
<style>${CSS}</style></head><body>
<header class="top">
  <div class="brand">◈ Drift</div>
  <div class="meta">${escapeHtml(opts.filePath)} · <span class="mode">${modeLabel}</span></div>
</header>
<section class="verdict" style="--badge:${b.color};--badgebg:${b.bg}">
  <div class="badge">${escapeHtml(b.label)} · ${conf}% confidence</div>
  <p class="reason">${escapeHtml(opts.verdict.reasoning)}</p>
</section>
<section class="compare">
  ${panel("Before", opts.before, "drift-before")}
  ${panel("After", opts.after, "drift-after")}
</section>
<section class="fix">
  <h3>Proposed fix</h3>
  ${diffHtml}
</section>
<footer class="foot">Reviewed by <strong>Drift</strong> · ${escapeHtml(opts.model)} · reasons in your design tokens, not pixels.</footer>
</body></html>`;
}

/** Write the report to disk and best-effort open it in the browser. */
export async function writeAndOpenReport(html: string, outPath: string, open = true): Promise<void> {
  await writeFile(outPath, html, "utf8");
  if (open) {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${cmd} "${outPath}"`, () => {});
  }
}

const CSS = `
*{box-sizing:border-box}
body{margin:0;font-family:'Inter',-apple-system,system-ui,sans-serif;background:#0B0D12;color:#E6E8EE}
.top{display:flex;align-items:center;justify-content:space-between;padding:18px 28px;border-bottom:1px solid #1B1F2A}
.brand{font-weight:650;letter-spacing:.02em;color:#A5B4FC;font-size:16px}
.meta{color:#8A93A6;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.mode{color:#C7D2FE}
.verdict{margin:28px;padding:20px 22px;border-radius:14px;background:var(--badgebg);border:1px solid #1B1F2A}
.badge{display:inline-block;font-weight:600;color:var(--badge);border:1px solid var(--badge);padding:4px 12px;border-radius:999px;font-size:13px;margin-bottom:12px}
.reason{margin:0;line-height:1.6;color:#D3D8E3;max-width:74ch;font-size:15px}
.compare{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:0 28px}
.panel{margin:0}
.panel figcaption{color:#8A93A6;font-size:11px;text-transform:uppercase;letter-spacing:.09em;margin-bottom:10px;display:flex;gap:8px;align-items:center}
.live{color:#F87171;font-size:9px;letter-spacing:.05em}
.stage{background:#F9FAFB;border-radius:12px;border:1px solid #1B1F2A;display:grid;place-items:center;min-height:220px;overflow:hidden;padding:12px}
.stage img{max-width:100%;display:block}
.stage video{max-width:100%;display:block;border-radius:8px}
.fix{padding:28px}
.fix h3{color:#8A93A6;font-size:11px;text-transform:uppercase;letter-spacing:.09em;margin:0 0 12px}
.diff{background:#11141C;border:1px solid #1B1F2A;border-radius:12px;padding:16px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.55;margin:0}
.diff span{display:block;white-space:pre}
.diff .add{color:#86EFAC}
.diff .del{color:#FCA5A5}
.diff .hunk{color:#8A93A6}
.nofix{color:#86EFAC;margin:0}
.foot{padding:20px 28px;color:#5B6478;font-size:12px;border-top:1px solid #1B1F2A;margin-top:8px}
.foot strong{color:#A5B4FC}
@media(max-width:720px){.compare{grid-template-columns:1fr}}
`;
