/**
 * cli-submission.ts — assembles the 60-second RAISE-hack SUBMISSION video for
 * "Scenario" from existing assets, timed to a Gradium voice-over.
 *
 * Pipeline:
 *   1. TTS each of the 6 script segments → WAV (Gradium, default EN voice).
 *      On any TTS failure, fall back to SILENT segments timed word_count/2.7s.
 *   2. Build 6 video segments on a 1920x1080 / 30fps / yuv420p canvas, each
 *      lasting (VO duration + 0.4s):
 *        - seg1/2/5/6: branded flame title cards (HTML -> PNG via Playwright)
 *        - seg3: Ken-Burns zoompan over the money-shot review report
 *        - seg4: captioned reception replay, trimmed + speed-matched, blurred pad
 *   3. Concat all 6 with the ffmpeg concat FILTER (re-encode; inputs differ).
 *   4. Build a master VO track (6 clips, each + 0.4s trailing silence) and mux
 *      it (AAC) over the concatenated video. +faststart.
 *   5. Emit a 480px-wide GIF preview and verify with ffprobe.
 *
 * Run from mcp-server/:  npx tsx src/cli-submission.ts
 */
import "./env.js";
import { chromium } from "playwright";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ttsToFile } from "./gradium.js";

const pexecFile = promisify(execFile);
const ff = (args: string[]) => pexecFile("ffmpeg", args, { maxBuffer: 64 * 1024 * 1024 });

/* ------------------------------ config ------------------------------ */

const W = 1920;
const H = 1080;
const FPS = 30;
const BRAND = "#FF5A1F"; // flame
const BG = "0x0a0a0f";
const TAIL = 0.4; // seconds of visual/audio pad appended to each VO clip

const ROOT = "/Users/edouardfoussier/code/hackathons/raise-hack/drift";
const CACHE = path.join(ROOT, ".drift-cache");
const OUT_DIR = path.join(CACHE, "submission");
const REVIEW_PNG = path.join(CACHE, "moneyshot", "review-report.png");
const RECEPTION = path.join(CACHE, "deja-reception", "reception.webm");

const SCRIPT: string[] = [
  "Hi, I'm Edouard — I built Scenario for RAISE-hack, remotely. Here's what it does.",
  "AI agents ship UI five times faster than anyone can review it. Cursor shows you it runs — but did it stay on your design system?",
  "Scenario replays your real UI before and after any change, and reasons in your design tokens. A button's padding drifted off the four-pixel scale, its color left the palette. Accidental regression, ninety-seven percent — and here's the one-line fix.",
  "But it doesn't just review. Describe a flow, and its AI drives your real app — deterministically — filming the perfect demo. Real backend: watch the stock go sixty to seventy-two as the delivery lands.",
  "Captions, voice-over powered by Gradium, a branded intro and outro — a share-ready video every time. In fact… this whole video was made by Scenario.",
  "Ship the demo, not just the code. Scenario — get scenar dot I O.",
];

/* ------------------------------ ffprobe ------------------------------ */

async function probeDuration(input: string): Promise<number> {
  const { stdout } = await pexecFile("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    input,
  ]);
  const d = parseFloat(stdout.trim());
  return Number.isFinite(d) ? d : 0;
}

/* ------------------------------ card HTML ------------------------------ */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Premium dark shell with a flame radial glow + faint grain, sized 1920x1080. */
function cardShell(inner: string): string {
  const base = Math.min(W, H); // 1080
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${W}px; height:${H}px; overflow:hidden; }
  body {
    background:#0a0a0f;
    font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:#f4f4f7; -webkit-font-smoothing:antialiased; position:relative;
  }
  .glow { position:absolute; inset:0; pointer-events:none;
    background:
      radial-gradient(60% 45% at 50% 32%, ${BRAND}30 0%, transparent 62%),
      radial-gradient(80% 60% at 50% 112%, ${BRAND}1a 0%, transparent 70%);
  }
  .grain { position:absolute; inset:0; pointer-events:none; opacity:0.05; mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  }
  .stage { position:absolute; inset:0; display:flex; flex-direction:column;
    align-items:center; justify-content:center; text-align:center;
    padding:${Math.round(base * 0.09)}px; gap:${Math.round(base * 0.03)}px; }
  .mark { display:inline-flex; align-items:center; gap:${Math.round(base * 0.018)}px;
    font-size:${Math.round(base * 0.036)}px; font-weight:600; letter-spacing:0.02em; color:${BRAND}; }
  .mark .flame { font-size:${Math.round(base * 0.04)}px; filter:drop-shadow(0 0 ${Math.round(base * 0.02)}px ${BRAND}); }
  .title { font-size:${Math.round(base * 0.16)}px; font-weight:800; line-height:1.02; letter-spacing:-0.02em;
    background:linear-gradient(180deg,#ffffff 0%,#c9c9d4 100%);
    -webkit-background-clip:text; background-clip:text; color:transparent; }
  .subtitle { font-size:${Math.round(base * 0.04)}px; font-weight:400; line-height:1.4; color:#a7a7b4; max-width:80%; }
  .subtitle .accent { color:${BRAND}; font-weight:600; }
  .hook { font-size:${Math.round(base * 0.066)}px; font-weight:800; line-height:1.12; letter-spacing:-0.02em;
    color:#f4f4f7; max-width:86%; }
  .hook .accent { color:${BRAND}; }
  .cta { font-size:${Math.round(base * 0.10)}px; font-weight:800; line-height:1.06; letter-spacing:-0.02em;
    color:#f4f4f7; max-width:92%; }
  .cta .accent { color:${BRAND}; }
  .pill { margin-top:${Math.round(base * 0.02)}px; display:inline-flex; align-items:center;
    padding:${Math.round(base * 0.026)}px ${Math.round(base * 0.055)}px; border-radius:999px;
    font-size:${Math.round(base * 0.044)}px; font-weight:700; color:#0a0a0f; background:${BRAND};
    box-shadow:0 0 ${Math.round(base * 0.08)}px ${BRAND}66; }
  .reveal { font-size:${Math.round(base * 0.088)}px; font-weight:800; line-height:1.1; letter-spacing:-0.02em;
    color:#f4f4f7; max-width:88%; }
  .reveal .accent { color:${BRAND}; }
  </style></head><body>
  <div class="glow"></div><div class="grain"></div>
  <div class="stage">${inner}</div>
</body></html>`;
}

function seg1Html(): string {
  return cardShell(`
    <div class="mark"><span class="flame">&#9670;</span> Scenario</div>
    <div class="title">Scenario</div>
    <div class="subtitle">built by <span class="accent">Edouard</span> · RAISE-hack <span class="accent">(remote)</span></div>
  `);
}

function seg2Html(): string {
  return cardShell(`
    <div class="mark"><span class="flame">&#9670;</span> the problem</div>
    <div class="hook">AI agents ship UI <span class="accent">5&times; faster</span> than anyone can review it.<br/>
      Cursor shows you it <span class="accent">runs</span> — but did it stay on your <span class="accent">design system?</span></div>
  `);
}

function seg5Html(): string {
  return cardShell(`
    <div class="mark"><span class="flame">&#9670;</span> Scenario</div>
    <div class="reveal">Captions, voice-over, a branded intro &amp; outro.<br/>
      This whole video was <span class="accent">made by Scenario.</span></div>
  `);
}

function seg6Html(): string {
  return cardShell(`
    <div class="cta">Ship the demo, <span class="accent">not just the code.</span></div>
    <div class="pill">getscenar.io</div>
  `);
}

async function htmlToPng(html: string, outPng: string): Promise<void> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.waitForTimeout(140);
    await page.screenshot({ path: outPng, clip: { x: 0, y: 0, width: W, height: H } });
    await page.close();
  } finally {
    await browser.close();
  }
}

/* ------------------------------ segments ------------------------------ */

/** Still card PNG -> 1920x1080 segment of `secs` with gentle fade in/out. */
async function cardSegment(png: string, secs: number, outMp4: string): Promise<void> {
  const fadeDur = Math.min(0.45, secs / 4);
  const fadeOutStart = Math.max(0, secs - fadeDur);
  const vf = [
    `scale=${W}:${H}:force_original_aspect_ratio=decrease`,
    `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${BG}`,
    `fade=t=in:st=0:d=${fadeDur.toFixed(3)}`,
    `fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeDur.toFixed(3)}`,
    `fps=${FPS}`, `setsar=1`, `format=yuv420p`,
  ].join(",");
  await ff([
    "-y", "-loop", "1", "-t", secs.toFixed(3), "-i", png,
    "-vf", vf, "-r", String(FPS),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high",
    outMp4,
  ]);
}

/**
 * Seg3 — Ken-Burns over the money-shot report. Two cheap steps:
 *   (a) pre-composite ONCE to a fixed 1920x1080 still: sharp fit-to-height
 *       report over a blurred, darkened side-pad;
 *   (b) run zoompan on that single still, pushing wide -> 1.34x toward the upper
 *       third where the red badge + BEFORE/AFTER buttons live.
 *
 * CRITICAL: the still is fed as a SINGLE frame (no -loop / -t). zoompan's `d`
 * then drives the exact output frame count. Feeding a looped image instead makes
 * zoompan emit d frames PER input image (461x461) and it hangs for minutes.
 */
async function reviewSegment(
  png: string,
  secs: number,
  work: string,
  outMp4: string,
): Promise<void> {
  const frames = Math.round(secs * FPS);
  const zEnd = 1.34;
  const zStep = ((zEnd - 1) / Math.max(1, frames - 1)).toFixed(6);
  const fadeDur = 0.4;
  const fadeOutStart = Math.max(0, secs - fadeDur);

  // (a) Build the pre-composited base still once, at output size (fast zoompan).
  const basePng = path.join(work, "seg3_base.png");
  await ff([
    "-y", "-i", png,
    "-filter_complex",
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},` +
      `boxblur=32:2,eq=brightness=-0.22[bg];` +
      `[0:v]scale=-1:${H}:force_original_aspect_ratio=decrease[fg];` +
      `[bg][fg]overlay=(W-w)/2:0,setsar=1[b]`,
    "-map", "[b]", "-frames:v", "1", basePng,
  ]);

  // (b) zoompan on the single still -> 1920x1080 (d drives frame count).
  const vf =
    `zoompan=z='min(zoom+${zStep},${zEnd})':` +
    `x='iw/2-(iw/zoom/2)':y='ih*0.28-(ih/zoom*0.28)':` +
    `d=${frames}:s=${W}x${H}:fps=${FPS},` +
    `fade=t=in:st=0:d=${fadeDur}:color=black,` +
    `fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeDur},` +
    `setsar=1,format=yuv420p`;
  await ff([
    "-y", "-i", basePng,
    "-vf", vf, "-r", String(FPS),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high",
    outMp4,
  ]);
}

/**
 * Seg4 — reception replay. Trim to the legible arc (stock 60 shown -> Valider
 * checklist -> after stock 72), fit portrait to 1080 height, blurred side pad,
 * and speed-match to the VO duration via setpts.
 */
async function receptionSegment(webm: string, secs: number, outMp4: string): Promise<void> {
  // Trim window inside the 37.28s source that carries the story beats.
  const trimStart = 2.4;
  const trimEnd = 36.2;
  const srcSpan = trimEnd - trimStart; // ~33.8s of source
  const speed = srcSpan / secs; // >1 = speed up to fit VO
  const ptsFactor = (1 / speed).toFixed(5);
  const fadeDur = 0.4;
  const fadeOutStart = Math.max(0, secs - fadeDur);
  const filter =
    `[0:v]trim=${trimStart}:${trimEnd},setpts=(PTS-STARTPTS)*${ptsFactor}[t];` +
    // blurred background fill
    `[t]split=2[fgsrc][bgsrc];` +
    `[bgsrc]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},` +
    `boxblur=30:2,eq=brightness=-0.22[bg];` +
    `[fgsrc]scale=-1:${H}:force_original_aspect_ratio=decrease[fg];` +
    `[bg][fg]overlay=(W-w)/2:0,` +
    `fade=t=in:st=0:d=${fadeDur}:color=black,` +
    `fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeDur},` +
    `fps=${FPS},setsar=1,format=yuv420p[outv]`;
  await ff([
    "-y", "-i", webm,
    "-filter_complex", filter, "-map", "[outv]",
    "-t", secs.toFixed(3), "-r", String(FPS),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high",
    outMp4,
  ]);
}

/* ------------------------------ concat + audio ------------------------------ */

/** Concat 6 normalized segments via the concat filter (re-encode). */
async function concatSegments(segs: string[], outMp4: string): Promise<void> {
  const inputs: string[] = [];
  for (const s of segs) inputs.push("-i", s);
  const norm = (i: number) =>
    `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
    `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${BG},` +
    `fps=${FPS},setsar=1,format=yuv420p[v${i}]`;
  const chains = segs.map((_, i) => norm(i)).join(";");
  const labels = segs.map((_, i) => `[v${i}]`).join("");
  const filter = `${chains};${labels}concat=n=${segs.length}:v=1:a=0[outv]`;
  await ff([
    "-y", ...inputs,
    "-filter_complex", filter, "-map", "[outv]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-movflags", "+faststart",
    outMp4,
  ]);
}

/**
 * Build the master VO wav: each clip followed by TAIL seconds of silence so the
 * audio lines up with the (VO + 0.4s) visual segments. Mono, 48kHz.
 */
async function buildMasterAudio(wavs: string[], work: string, outWav: string): Promise<void> {
  const padded: string[] = [];
  for (let i = 0; i < wavs.length; i++) {
    const p = path.join(work, `a_pad_${i}.wav`);
    // apad adds silence; pad_dur=TAIL after the content.
    await ff([
      "-y", "-i", wavs[i],
      "-af", `aresample=48000,apad=pad_dur=${TAIL}`,
      "-ar", "48000", "-ac", "1",
      p,
    ]);
    padded.push(p);
  }
  const inputs: string[] = [];
  for (const p of padded) inputs.push("-i", p);
  const labels = padded.map((_, i) => `[${i}:a]`).join("");
  const filter = `${labels}concat=n=${padded.length}:v=0:a=1[outa]`;
  await ff([
    "-y", ...inputs,
    "-filter_complex", filter, "-map", "[outa]",
    "-ar", "48000", "-ac", "1",
    outWav,
  ]);
}

/** Mux the master audio over the concatenated video (audio -> AAC). */
async function muxAV(video: string, audio: string, outMp4: string): Promise<void> {
  await ff([
    "-y", "-i", video, "-i", audio,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    "-shortest",
    outMp4,
  ]);
}

/** Palette GIF preview at width 480. */
async function mp4ToGif(mp4: string, outGif: string): Promise<void> {
  await ff([
    "-y", "-i", mp4,
    "-vf", "fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
    outGif,
  ]);
}

/** N seconds of silent WAV (fallback when TTS fails). */
async function silentWav(secs: number, outWav: string): Promise<void> {
  await ff([
    "-y", "-f", "lavfi", "-t", secs.toFixed(3),
    "-i", "anullsrc=r=48000:cl=mono",
    "-ar", "48000", "-ac", "1",
    outWav,
  ]);
}

/* ------------------------------ main ------------------------------ */

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const work = await mkdtemp(path.join(tmpdir(), "scenario-submission-"));
  const status: {
    ttsOk: boolean;
    ttsError?: string;
    segDurations: number[];
    voDurations: number[];
  } = { ttsOk: true, segDurations: [], voDurations: [] };

  try {
    /* 1. TTS the 6 segments (or silent fallback). */
    const wavs: string[] = [];
    let ttsFailed = false;
    for (let i = 0; i < SCRIPT.length; i++) {
      const wav = path.join(work, `vo_${i}.wav`);
      if (!ttsFailed) {
        try {
          await ttsToFile(SCRIPT[i], wav);
        } catch (err) {
          ttsFailed = true;
          status.ttsOk = false;
          status.ttsError = String((err as Error).message ?? err);
        }
      }
      if (ttsFailed) {
        // word_count / 2.7 seconds of silence
        const words = SCRIPT[i].trim().split(/\s+/).length;
        await silentWav(words / 2.7, wav);
      }
      wavs.push(wav);
    }

    const voDurations: number[] = [];
    for (const w of wavs) voDurations.push(await probeDuration(w));
    status.voDurations = voDurations;
    const segDurations = voDurations.map((d) => d + TAIL);
    status.segDurations = segDurations;

    /* 2. Render the 4 title-card PNGs. */
    const png1 = path.join(work, "card1.png");
    const png2 = path.join(work, "card2.png");
    const png5 = path.join(work, "card5.png");
    const png6 = path.join(work, "card6.png");
    await htmlToPng(seg1Html(), png1);
    await htmlToPng(seg2Html(), png2);
    await htmlToPng(seg5Html(), png5);
    await htmlToPng(seg6Html(), png6);

    /* 3. Build the 6 video segments. */
    const s0 = path.join(work, "seg0.mp4");
    const s1 = path.join(work, "seg1.mp4");
    const s2 = path.join(work, "seg2.mp4");
    const s3 = path.join(work, "seg3.mp4");
    const s4 = path.join(work, "seg4.mp4");
    const s5 = path.join(work, "seg5.mp4");

    await cardSegment(png1, segDurations[0], s0);
    await cardSegment(png2, segDurations[1], s1);
    await reviewSegment(REVIEW_PNG, segDurations[2], work, s2);
    await receptionSegment(RECEPTION, segDurations[3], s3);
    await cardSegment(png5, segDurations[4], s4);
    await cardSegment(png6, segDurations[5], s5);

    /* 4. Concat video. */
    const concatMp4 = path.join(work, "concat.mp4");
    await concatSegments([s0, s1, s2, s3, s4, s5], concatMp4);

    /* 5. Master audio + mux. */
    const masterWav = path.join(work, "master.wav");
    await buildMasterAudio(wavs, work, masterWav);

    const finalMp4 = path.join(OUT_DIR, "scenario-submission.mp4");
    await muxAV(concatMp4, masterWav, finalMp4);

    /* 6. GIF + verify. */
    const gifPath = path.join(OUT_DIR, "scenario-submission.gif");
    await mp4ToGif(finalMp4, gifPath);

    const total = await probeDuration(finalMp4);

    /* Report. */
    console.log(JSON.stringify({
      ttsOk: status.ttsOk,
      ttsError: status.ttsError ?? null,
      voDurations: voDurations.map((d) => Number(d.toFixed(3))),
      segDurations: segDurations.map((d) => Number(d.toFixed(3))),
      totalSeconds: Number(total.toFixed(3)),
      mp4: finalMp4,
      gif: gifPath,
    }, null, 2));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
