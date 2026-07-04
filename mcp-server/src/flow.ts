import { chromium, devices, type Page } from "playwright";
import { cp, mkdtemp, writeFile, rm, mkdir, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets");
const OVERLAY = path.join(ASSETS, "cursor-overlay.js");
const OVERLAY_TAP = path.join(ASSETS, "tap-overlay.js");
const OVERLAY_KB = path.join(ASSETS, "keyboard-overlay.js");
const CAPTION = path.join(ASSETS, "caption-overlay.js");

export type FlowStep =
  | { action: "move"; selector: string }
  | { action: "hover"; selector: string; dwell?: number }
  | { action: "click"; selector: string }
  | { action: "type"; selector: string; text: string }
  | { action: "scroll"; selector?: string; by?: number; dwell?: number }
  | { action: "caption"; text: string }
  | { action: "wait"; ms: number };

export interface RecordFlowOpts {
  appDir: string;
  previewRel: string;
  changedRelToApp: string;
  content: string;
  steps: FlowStep[];
  outWebm: string;
  viewport?: { width: number; height: number };
  /** If set, save a page screenshot after the last step (cursor overlay included) — for verification. */
  verifyShot?: string;
}

/** Smooth wheel scroll (broken into small increments so it reads as motion on video). */
async function smoothScroll(page: Page, by: number): Promise<void> {
  const n = 14;
  for (let i = 0; i < n; i++) {
    await page.mouse.wheel(0, by / n);
    await page.waitForTimeout(28);
  }
}

async function moveTo(page: Page, selector: string, steps = 36, timeout = 6000): Promise<void> {
  // Fail fast (6s) instead of Playwright's 30s default so a missing selector in a
  // tolerant live flow doesn't stall the whole recording.
  const loc = page.locator(selector).first();
  // Bring it into the viewport first — real screens scroll, and a target below the
  // fold can't be tapped/focused (breaks the synthetic keyboard trigger).
  await loc.scrollIntoViewIfNeeded({ timeout }).catch(() => {});
  const box = await loc.boundingBox({ timeout });
  if (!box) throw new Error(`flow: selector not found or not visible: ${selector}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
}

/** Drive a realistic user flow with a visible cursor and record it to a webm. */
export async function recordFlow(opts: RecordFlowOpts): Promise<string> {
  const vp = opts.viewport ?? { width: 900, height: 620 };
  const sandbox = await mkdtemp(path.join(tmpdir(), "drift-flow-"));
  const videoDir = await mkdtemp(path.join(tmpdir(), "drift-vid-"));
  await mkdir(path.dirname(opts.outWebm), { recursive: true });

  const browser = await chromium.launch();
  try {
    await cp(opts.appDir, sandbox, { recursive: true });
    await writeFile(path.join(sandbox, opts.changedRelToApp), opts.content, "utf8");

    const context = await browser.newContext({ viewport: vp, recordVideo: { dir: videoDir, size: vp } });
    await context.addInitScript({ path: OVERLAY });
    const page = await context.newPage();
    await page.goto("file://" + path.join(sandbox, opts.previewRel), { waitUntil: "networkidle" });

    // ease the cursor in from the lower-middle
    await page.mouse.move(vp.width * 0.5, vp.height * 0.92, { steps: 1 });
    await page.waitForTimeout(350);

    for (const s of opts.steps) {
      switch (s.action) {
        case "move":
          await moveTo(page, s.selector);
          break;
        case "hover":
          await moveTo(page, s.selector);
          await page.waitForTimeout(s.dwell ?? 700);
          break;
        case "click":
          await moveTo(page, s.selector);
          await page.waitForTimeout(120);
          await page.mouse.down();
          await page.waitForTimeout(90);
          await page.mouse.up();
          await page.waitForTimeout(280);
          break;
        case "type":
          await moveTo(page, s.selector);
          await page.mouse.down();
          await page.mouse.up();
          await page.waitForTimeout(140);
          await page.keyboard.type(s.text, { delay: 55 });
          await page.waitForTimeout(220);
          break;
        case "scroll":
          if (s.selector) await page.locator(s.selector).first().scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {});
          else {
            await page.mouse.move(vp.width * 0.5, vp.height * 0.5, { steps: 6 });
            await smoothScroll(page, s.by ?? 500);
          }
          await page.waitForTimeout(s.dwell ?? 500);
          break;
        case "wait":
          await page.waitForTimeout(s.ms);
          break;
      }
    }
    await page.waitForTimeout(450);
    if (opts.verifyShot) await page.screenshot({ path: opts.verifyShot });

    const video = page.video();
    await context.close(); // flushes the webm
    if (video) {
      const src = await video.path();
      await rename(src, opts.outWebm).catch(async () => {
        await cp(src, opts.outWebm);
      });
    }
  } finally {
    await browser.close();
    await rm(sandbox, { recursive: true, force: true });
    await rm(videoDir, { recursive: true, force: true });
  }
  return opts.outWebm;
}

export interface LiveFlowOpts {
  /** Live URL to drive (e.g. a running dev server). */
  url: string;
  steps: FlowStep[];
  outWebm: string;
  viewport?: { width: number; height: number };
  /** JS source run before the page loads (e.g. to set an auth token in localStorage). */
  initScript?: string;
  /** Abort all **\/api\/** requests (avoids 401 kicks when bypassing auth). */
  blockApi?: boolean;
  /** Playwright device descriptor name (e.g. "iPhone 13") for mobile emulation. */
  device?: string;
  /** Allow GET /api (real reads) but abort writes (POST/PATCH/PUT/DELETE) — never mutates prod. */
  readOnly?: boolean;
  /** Pointer style: "cursor" (arrow, default) or "touch" (mobile tap circle). */
  pointer?: "cursor" | "touch";
  /** Show a synthetic iOS keyboard that slides up on text-field focus. */
  keyboard?: boolean;
  /** Inject the caption-overlay banner so `{ action: "caption" }` steps narrate the flow. */
  captions?: boolean;
}

/** Record a flow with a visible cursor against a LIVE URL (real app), tolerant of missing selectors. */
export async function recordLiveFlow(opts: LiveFlowOpts): Promise<string> {
  const vp = opts.viewport ?? { width: 400, height: 860 };
  const videoDir = await mkdtemp(path.join(tmpdir(), "drift-live-"));
  await mkdir(path.dirname(opts.outWebm), { recursive: true });

  const browser = await chromium.launch();
  try {
    const dev = opts.device ? devices[opts.device] : undefined;
    const size = dev?.viewport ?? vp;
    const context = await browser.newContext(
      dev ? { ...dev, recordVideo: { dir: videoDir, size } } : { viewport: vp, recordVideo: { dir: videoDir, size } },
    );
    if (opts.readOnly) {
      await context.route("**/api/**", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
    } else if (opts.blockApi) {
      await context.route("**/api/**", (r) => r.abort());
    }
    await context.addInitScript({ path: opts.pointer === "touch" ? OVERLAY_TAP : OVERLAY });
    if (opts.keyboard) await context.addInitScript({ path: OVERLAY_KB });
    if (opts.captions) await context.addInitScript({ path: CAPTION });
    if (opts.initScript) await context.addInitScript(opts.initScript);

    const page = await context.newPage();
    await page.goto(opts.url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1600);
    await page.mouse.move(vp.width * 0.5, vp.height * 0.9, { steps: 1 });
    await page.waitForTimeout(250);

    for (const s of opts.steps) {
      try {
        switch (s.action) {
          case "move":
            await moveTo(page, s.selector);
            break;
          case "hover":
            await moveTo(page, s.selector);
            await page.waitForTimeout(s.dwell ?? 700);
            break;
          case "click":
            await moveTo(page, s.selector);
            await page.waitForTimeout(120);
            await page.mouse.down();
            await page.waitForTimeout(90);
            await page.mouse.up();
            await page.waitForTimeout(280);
            break;
          case "type":
            await moveTo(page, s.selector);
            await page.mouse.down();
            await page.mouse.up();
            // Guarantee focus (→ focusin → synthetic keyboard) even if the tap
            // landed on an occluding fixed element (e.g. a bottom nav bar).
            await page.locator(s.selector).first().focus().catch(() => {});
            await page.waitForTimeout(200);
            await page.keyboard.type(s.text, { delay: 55 });
            await page.waitForTimeout(220);
            break;
          case "scroll":
            if (s.selector) await page.locator(s.selector).first().scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {});
            else {
              await page.mouse.move(size.width * 0.5, size.height * 0.5, { steps: 6 });
              await smoothScroll(page, s.by ?? 500);
            }
            await page.waitForTimeout(s.dwell ?? 500);
            break;
          case "caption":
            await page.evaluate((t) => (window as any).__cap?.(t), s.text);
            await page.waitForTimeout(1200);
            break;
          case "wait":
            await page.waitForTimeout(s.ms);
            break;
        }
      } catch (e) {
        const where = "selector" in s ? s.selector : s.action;
        console.error(`  (skipped ${s.action} ${where}: ${(e as Error).message.split("\n")[0]})`);
      }
    }

    await page.waitForTimeout(450);
    const video = page.video();
    await context.close();
    if (video) {
      const src = await video.path();
      await rename(src, opts.outWebm).catch(async () => {
        await cp(src, opts.outWebm);
      });
    }
  } finally {
    await browser.close();
    await rm(videoDir, { recursive: true, force: true });
  }
  return opts.outWebm;
}
