import { type Browser } from "playwright";
import { cp, mkdir, mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export interface CaptureOpts {
  /** Design-system dir copied to a temp sandbox. */
  appDir: string;
  /** Preview HTML relative to appDir. */
  previewRel: string;
  /** Changed file relative to appDir (content swapped per state). */
  changedRelToApp: string;
  /** File content for this state (HEAD or working). */
  content: string;
  /** Stable container to screenshot each frame (so motion is visible against a fixed frame). */
  frameSelector: string;
  /** Element to interact with. */
  targetSelector: string;
  interaction: "hover" | "click";
  /** Directory to write frames. */
  outDir: string;
  /** "before" | "after" — used in filenames. */
  label: string;
  /** Number of frames including the resting frame (default 7). */
  frames?: number;
  /** Delay between frames in ms (default 80). */
  frameGapMs?: number;
  viewport?: { width: number; height: number };
}

export interface FrameSet {
  label: string;
  framePaths: string[];
  frameBase64: string[];
}

/**
 * Capture a component's interaction (hover/click) as a sequence of frames:
 * frame 0 is the resting state, then frames sampled across the transition.
 */
export async function captureInteractionFrames(browser: Browser, opts: CaptureOpts): Promise<FrameSet> {
  const n = opts.frames ?? 7;
  const gap = opts.frameGapMs ?? 80;
  const sandbox = await mkdtemp(path.join(tmpdir(), "drift-cap-"));
  const framePaths: string[] = [];
  try {
    await cp(opts.appDir, sandbox, { recursive: true });
    await writeFile(path.join(sandbox, opts.changedRelToApp), opts.content, "utf8");
    await mkdir(opts.outDir, { recursive: true });

    const page = await browser.newPage({
      viewport: opts.viewport ?? { width: 1200, height: 800 },
      deviceScaleFactor: 2,
    });
    await page.goto("file://" + path.join(sandbox, opts.previewRel), { waitUntil: "networkidle" });
    await page.waitForTimeout(120);

    const frame = page.locator(opts.frameSelector).first();
    const target = page.locator(opts.targetSelector).first();

    const shoot = async (i: number) => {
      const p = path.join(opts.outDir, `${opts.label}-${i}.png`);
      await frame.screenshot({ path: p });
      framePaths.push(p);
    };

    await shoot(0); // resting frame
    if (opts.interaction === "click") await target.click(); else await target.hover();
    for (let i = 1; i < n; i++) {
      await page.waitForTimeout(gap);
      await shoot(i);
    }

    await page.close();
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }

  const bufs = await Promise.all(framePaths.map((p) => readFile(p)));
  return { label: opts.label, framePaths, frameBase64: bufs.map((b) => b.toString("base64")) };
}
