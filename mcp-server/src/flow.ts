import { chromium, type Page } from "playwright";
import { cp, mkdtemp, writeFile, rm, mkdir, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OVERLAY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/cursor-overlay.js");

export type FlowStep =
  | { action: "move"; selector: string }
  | { action: "hover"; selector: string; dwell?: number }
  | { action: "click"; selector: string }
  | { action: "type"; selector: string; text: string }
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

async function moveTo(page: Page, selector: string, steps = 28): Promise<void> {
  const box = await page.locator(selector).first().boundingBox();
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
