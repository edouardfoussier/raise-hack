/**
 * Video compositor — wraps a finished demo video with a branded intro card and an
 * outro CTA card, then exports a final MP4 (H.264) + a GIF.
 *
 * Orthogonal to the recorder: it operates on an already-recorded webm. The two
 * cards are rendered as HTML → PNG with Playwright at the exact size of the input
 * video, turned into short fade-in/out segments with ffmpeg, and concatenated with
 * the main clip via the ffmpeg concat *filter* (full re-encode) so segments with
 * differing codecs/SAR/fps still join cleanly.
 */
import { chromium } from "playwright";
import { mkdir, mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CaptionCue } from "./flow.js";

const pexecFile = promisify(execFile);

export interface ComposeOpts {
  /** Absolute (or cwd-relative) path to the finished demo video (webm/mp4/…). */
  inputVideo: string;
  /** Big bold intro title, also used as the brand-mark word. */
  title: string;
  /** Optional intro subtitle line. */
  subtitle?: string;
  /** Optional outro call-to-action (big text on the outro card). */
  cta?: string;
  /** Optional URL shown as a pill button on the outro card. */
  url?: string;
  /** Brand accent (hex). Defaults to electric teal. */
  brand?: string;
  /** Where final.mp4 / final.gif are written. */
  outDir: string;
  /** Intro card duration in ms (default 2200). */
  introMs?: number;
  /** Outro card duration in ms (default 2600). */
  outroMs?: number;
  /**
   * Timed per-step captions to burn as a subtitle. Rendered in a dedicated band
   * added BELOW the app content (never overlapping it). Times are relative to
   * the recorded main clip. When omitted (or empty), no band is added and the
   * app's own top caption banner (if any) is used as-is.
   */
  subtitles?: CaptionCue[];
  /** Total duration of the main recording in ms (to time the last subtitle). */
  mainDurationMs?: number;
}

export interface ComposeResult {
  mp4Path: string;
  gifPath: string;
  width: number;
  height: number;
  fps: number;
  introMs: number;
  outroMs: number;
  /** Total duration of the composed MP4 in seconds (probed after encode). */
  totalSeconds: number;
}

interface VideoMeta {
  width: number;
  height: number;
  fps: number;
}

/** Probe WxH + fps of the input; fall back to portrait 390x844 @ 30 on any failure. */
async function probeVideo(input: string): Promise<VideoMeta> {
  const fallback: VideoMeta = { width: 390, height: 844, fps: 30 };
  try {
    const { stdout } = await pexecFile("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height,r_frame_rate",
      "-of", "json",
      input,
    ]);
    const parsed = JSON.parse(stdout);
    const s = parsed?.streams?.[0];
    if (!s?.width || !s?.height) return fallback;
    let fps = 30;
    if (typeof s.r_frame_rate === "string" && s.r_frame_rate.includes("/")) {
      const [n, d] = s.r_frame_rate.split("/").map(Number);
      if (n > 0 && d > 0) fps = Math.round(n / d);
    }
    if (!Number.isFinite(fps) || fps <= 0) fps = 30;
    return { width: Number(s.width), height: Number(s.height), fps };
  } catch {
    return fallback;
  }
}

/** Probe duration in seconds (0 on failure). */
async function probeDuration(input: string): Promise<number> {
  try {
    const { stdout } = await pexecFile("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      input,
    ]);
    const d = parseFloat(stdout.trim());
    return Number.isFinite(d) ? d : 0;
  } catch {
    return 0;
  }
}

/* ------------------------------ card HTML ------------------------------ */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared premium dark look: near-black bg, radial glow in brand, faint grain. */
function shell(brand: string, w: number, h: number, inner: string): string {
  // Scale the type to the smaller dimension so it looks right in portrait or landscape.
  const base = Math.min(w, h);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
  body {
    background: #0a0a0f;
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #f4f4f7;
    -webkit-font-smoothing: antialiased;
    position: relative;
  }
  .stage {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
    padding: ${Math.round(base * 0.09)}px;
    gap: ${Math.round(base * 0.03)}px;
  }
  /* radial glow tinted with the brand color */
  .glow {
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(60% 45% at 50% 30%, ${brand}2e 0%, transparent 62%),
      radial-gradient(80% 60% at 50% 110%, ${brand}18 0%, transparent 70%);
  }
  /* faint film grain via layered noise */
  .grain {
    position: absolute; inset: 0; pointer-events: none; opacity: 0.05;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
    mix-blend-mode: overlay;
  }
  .mark {
    display: inline-flex; align-items: center; gap: ${Math.round(base * 0.022)}px;
    font-size: ${Math.round(base * 0.05)}px; font-weight: 600; letter-spacing: 0.02em;
    color: ${brand};
  }
  .mark .dot {
    width: ${Math.round(base * 0.05)}px; height: ${Math.round(base * 0.05)}px;
    border-radius: 999px; background: ${brand};
    box-shadow: 0 0 ${Math.round(base * 0.06)}px ${brand}cc, 0 0 ${Math.round(base * 0.02)}px ${brand};
  }
  .title {
    font-size: ${Math.round(base * 0.14)}px; font-weight: 800; line-height: 1.02;
    letter-spacing: -0.02em;
    background: linear-gradient(180deg, #ffffff 0%, #c9c9d4 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .subtitle {
    font-size: ${Math.round(base * 0.042)}px; font-weight: 400; line-height: 1.4;
    color: #a7a7b4; max-width: 82%;
  }
  .cta {
    font-size: ${Math.round(base * 0.10)}px; font-weight: 800; line-height: 1.06;
    letter-spacing: -0.02em; color: #f4f4f7; max-width: 92%;
  }
  .cta .accent { color: ${brand}; }
  .pill {
    margin-top: ${Math.round(base * 0.02)}px;
    display: inline-flex; align-items: center; gap: ${Math.round(base * 0.02)}px;
    padding: ${Math.round(base * 0.028)}px ${Math.round(base * 0.06)}px;
    border-radius: 999px;
    font-size: ${Math.round(base * 0.045)}px; font-weight: 700;
    color: #0a0a0f; background: ${brand};
    box-shadow: 0 0 ${Math.round(base * 0.08)}px ${brand}66;
  }
  .madewith {
    position: absolute; bottom: ${Math.round(base * 0.06)}px; left: 0; right: 0;
    font-size: ${Math.round(base * 0.03)}px; color: #6f6f7d; letter-spacing: 0.04em;
  }
  .madewith b { color: ${brand}; font-weight: 700; }
</style></head><body>
  <div class="glow"></div>
  <div class="grain"></div>
  <div class="stage">${inner}</div>
</body></html>`;
}

function introHtml(opts: { title: string; subtitle?: string; brand: string; w: number; h: number }): string {
  const inner = `
    <div class="mark"><span class="dot"></span>${esc(opts.title)}</div>
    <div class="title">${esc(opts.title)}</div>
    ${opts.subtitle ? `<div class="subtitle">${esc(opts.subtitle)}</div>` : ""}
  `;
  return shell(opts.brand, opts.w, opts.h, inner);
}

function outroHtml(opts: { cta?: string; url?: string; title: string; brand: string; w: number; h: number }): string {
  const ctaText = opts.cta ?? "Try it now";
  // Highlight an arrow if present ("Try it → getscenar.io").
  const ctaHtml = esc(ctaText).replace("→", `<span class="accent">→</span>`);
  const inner = `
    <div class="cta">${ctaHtml}</div>
    ${opts.url ? `<div class="pill">${esc(opts.url)}</div>` : ""}
    <div class="madewith">made with <b>${esc(opts.title)}</b></div>
  `;
  return shell(opts.brand, opts.w, opts.h, inner);
}

/** Render a full HTML string to a PNG of exactly w×h. */
async function htmlToPng(
  html: string,
  w: number,
  h: number,
  outPng: string,
  omitBackground = false,
): Promise<void> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.waitForTimeout(120); // let gradients/fonts settle
    await page.screenshot({
      path: outPng,
      clip: { x: 0, y: 0, width: w, height: h },
      omitBackground, // transparent PNG for subtitle strips
    });
    await page.close();
  } finally {
    await browser.close();
  }
}

/**
 * One caption strip → a transparent PNG the full frame width and `band` tall,
 * with the text centered (brand-tinted). Rendered with the browser so it works
 * regardless of whether ffmpeg was built with a text/font filter.
 */
function captionStripHtml(text: string, w: number, band: number): string {
  const fontSize = Math.max(15, Math.round(band * 0.3));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body { width:${w}px; height:${band}px; overflow:hidden; background:transparent; }
    .wrap {
      width:${w}px; height:${band}px;
      display:flex; align-items:center; justify-content:center;
      padding:0 ${Math.round(w * 0.06)}px;
      font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif;
      color:#fff7ed; text-align:center; line-height:1.25;
      font-size:${fontSize}px; font-weight:600; letter-spacing:0.2px;
    }
  </style></head><body><div class="wrap">${esc(text)}</div></body></html>`;
}

/* ------------------------------ ffmpeg ------------------------------ */

/**
 * Turn a still PNG into a video segment of `ms` at the target size/fps, with a
 * gentle fade-in at the start and fade-out at the end. Encoded to H.264/yuv420p
 * so downstream concat re-encode is cheap and SAR is normalized to 1:1.
 */
async function pngToSegment(
  png: string,
  ms: number,
  meta: VideoMeta,
  outMp4: string,
): Promise<void> {
  const secs = Math.max(0.4, ms / 1000);
  const fadeDur = Math.min(0.5, secs / 3);
  const fadeOutStart = Math.max(0, secs - fadeDur);
  const vf = [
    `scale=${meta.width}:${meta.height}:force_original_aspect_ratio=decrease`,
    `pad=${meta.width}:${meta.height}:(ow-iw)/2:(oh-ih)/2:color=0x0a0a0f`,
    `fade=t=in:st=0:d=${fadeDur.toFixed(3)}`,
    `fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeDur.toFixed(3)}`,
    `setsar=1`,
    `format=yuv420p`,
  ].join(",");
  await pexecFile("ffmpeg", [
    "-y",
    "-loop", "1",
    "-t", secs.toFixed(3),
    "-i", png,
    "-r", String(meta.fps),
    "-vf", vf,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    outMp4,
  ]);
}

/**
 * Concat intro + main + outro with the concat *filter* (re-encode). Each input is
 * normalized to the same fps/size/SAR before concatenation so the filter never
 * complains about mismatched properties. The main clip is scaled+padded to fit.
 */
async function concatSegments(
  intro: string,
  main: string,
  outro: string,
  meta: VideoMeta,
  outMp4: string,
): Promise<void> {
  const norm = (label: string, idx: number) =>
    `[${idx}:v]scale=${meta.width}:${meta.height}:force_original_aspect_ratio=decrease,` +
    `pad=${meta.width}:${meta.height}:(ow-iw)/2:(oh-ih)/2:color=0x0a0a0f,` +
    `fps=${meta.fps},setsar=1,format=yuv420p[${label}]`;
  const filter =
    `${norm("v0", 0)};${norm("v1", 1)};${norm("v2", 2)};` +
    `[v0][v1][v2]concat=n=3:v=1:a=0[outv]`;
  await pexecFile("ffmpeg", [
    "-y",
    "-i", intro,
    "-i", main,
    "-i", outro,
    "-filter_complex", filter,
    "-map", "[outv]",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    "-movflags", "+faststart",
    outMp4,
  ]);
}

/**
 * Take the raw recorded clip and produce a normalized main clip at
 * `composed` size (= app frame + a bottom caption band), with each timed
 * caption shown as a subtitle IN THE BAND — so app content is never covered.
 *
 * Captions are rendered to transparent PNG strips with the browser and overlaid
 * (timed) with ffmpeg's `overlay` filter — no reliance on drawtext/libfreetype,
 * which many Homebrew ffmpeg builds omit. When there are no subtitles, `band` is
 * 0 and this just normalizes the clip.
 */
async function buildMainClip(
  rawMain: string,
  app: VideoMeta,
  composed: VideoMeta,
  band: number,
  subtitles: CaptionCue[],
  durationMs: number,
  work: string,
  outMp4: string,
): Promise<void> {
  const bandTop = composed.height - band;
  const total = Math.max(durationMs, ...subtitles.map((c) => c.startMs), 0);
  const sorted = [...subtitles].sort((a, b) => a.startMs - b.startMs);

  // Render each caption to a transparent strip PNG (frame-wide × band-tall).
  const strips: { png: string; start: number; end: number }[] = [];
  if (band > 0) {
    for (let i = 0; i < sorted.length; i++) {
      const cue = sorted[i];
      const png = path.join(work, `cap-${i}.png`);
      await htmlToPng(captionStripHtml(cue.text, composed.width, band), composed.width, band, png, true);
      const start = Math.max(0, cue.startMs / 1000);
      const nextStart = i + 1 < sorted.length ? sorted[i + 1].startMs / 1000 : total / 1000 + 2;
      const end = Math.max(start + 0.3, nextStart);
      strips.push({ png, start, end });
    }
  }

  // Filtergraph: scale app to the top area, pad the bottom band dark, add a thin
  // brand accent line, then overlay each timed caption strip in the band.
  const inputs: string[] = ["-i", rawMain];
  for (const s of strips) inputs.push("-i", s.png);

  const chain: string[] = [
    `[0:v]scale=${app.width}:${app.height}:force_original_aspect_ratio=decrease,` +
      `pad=${composed.width}:${composed.height}:(ow-iw)/2:0:color=0x0a0a0f,` +
      `fps=${composed.fps},setsar=1` +
      (band > 0
        ? `,drawbox=x=0:y=${bandTop}:w=${composed.width}:h=2:color=0xff5a1f@0.9:t=fill`
        : ``) +
      `[base]`,
  ];
  let last = "base";
  strips.forEach((s, i) => {
    const out = i === strips.length - 1 ? "vout" : `ov${i}`;
    // Strip input index in ffmpeg is i+1 (0 is the video).
    chain.push(
      `[${last}][${i + 1}:v]overlay=x=0:y=${bandTop}:` +
        `enable='between(t,${s.start.toFixed(3)},${s.end.toFixed(3)})'[${out}]`,
    );
    last = out;
  });
  if (!strips.length) chain.push(`[base]format=yuv420p[vout]`);
  else chain.push(`[${last}]format=yuv420p[voutf]`);
  const filter = chain.join(";");
  const mapLabel = strips.length ? "[voutf]" : "[vout]";

  await pexecFile("ffmpeg", [
    "-y",
    ...inputs,
    "-filter_complex", filter,
    "-map", mapLabel,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    outMp4,
  ]);
}

/** Palette-based GIF at width 360. */
async function mp4ToGif(mp4: string, outGif: string): Promise<void> {
  await pexecFile("ffmpeg", [
    "-y",
    "-i", mp4,
    "-vf",
    "fps=12,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
    outGif,
  ]);
}

/* ------------------------------ public API ------------------------------ */

export async function composeVideo(opts: ComposeOpts): Promise<ComposeResult> {
  const brand = opts.brand ?? "#2dd4bf";
  const introMs = opts.introMs ?? 2200;
  const outroMs = opts.outroMs ?? 2600;

  const inputAbs = path.resolve(process.cwd(), opts.inputVideo);
  const outDir = path.resolve(process.cwd(), opts.outDir);
  await mkdir(outDir, { recursive: true });

  const app = await probeVideo(inputAbs);

  // Timed subtitles → a dedicated bottom band sized to the app frame. The band
  // must be even (yuv420p) and is only added when there are subtitles to show.
  const subtitles = opts.subtitles ?? [];
  let band = 0;
  if (subtitles.length) {
    band = Math.round(Math.min(app.width, app.height) * 0.14);
    if (band % 2 !== 0) band += 1;
  }
  // The composed frame = app frame + caption band. Intro/outro/concat all use it.
  const meta: VideoMeta = { width: app.width, height: app.height + band, fps: app.fps };

  const work = await mkdtemp(path.join(tmpdir(), "scenario-compose-"));
  try {
    // 1. Render cards → PNG (at the FULL composed size so they letterbox-match)
    const introPng = path.join(work, "intro.png");
    const outroPng = path.join(work, "outro.png");
    await htmlToPng(
      introHtml({ title: opts.title, subtitle: opts.subtitle, brand, w: meta.width, h: meta.height }),
      meta.width,
      meta.height,
      introPng,
    );
    await htmlToPng(
      outroHtml({ cta: opts.cta, url: opts.url, title: opts.title, brand, w: meta.width, h: meta.height }),
      meta.width,
      meta.height,
      outroPng,
    );

    // 2. PNG → fading video segments
    const introMp4 = path.join(work, "intro.mp4");
    const outroMp4 = path.join(work, "outro.mp4");
    await pngToSegment(introPng, introMs, meta, introMp4);
    await pngToSegment(outroPng, outroMs, meta, outroMp4);

    // 2b. Main clip → normalize to composed size + burn subtitles in the band.
    const mainMp4 = path.join(work, "main-sub.mp4");
    const mainDurationMs =
      opts.mainDurationMs ?? Math.round((await probeDuration(inputAbs)) * 1000);
    await buildMainClip(inputAbs, app, meta, band, subtitles, mainDurationMs, work, mainMp4);

    // 3. Concat intro + main + outro (re-encode via concat filter)
    const mp4Path = path.join(outDir, "final.mp4");
    await concatSegments(introMp4, mainMp4, outroMp4, meta, mp4Path);

    // 4. GIF
    const gifPath = path.join(outDir, "final.gif");
    await mp4ToGif(mp4Path, gifPath);

    const totalSeconds = await probeDuration(mp4Path);
    return { mp4Path, gifPath, width: meta.width, height: meta.height, fps: meta.fps, introMs, outroMs, totalSeconds };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
