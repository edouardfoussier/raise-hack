import { chromium, type Browser } from "playwright";
import { cp, mkdir, mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { RenderResult } from "./types.js";

export interface RenderOpts {
  /** Absolute path to the design-system dir that gets copied to a temp sandbox. */
  appDir: string;
  /** Preview HTML relative to appDir (renders the component in isolation). */
  previewRel: string;
  /** Changed file relative to appDir (its content is swapped per state). */
  changedRelToApp: string;
  /** File content at git HEAD. */
  beforeContent: string;
  /** File content in the working tree. */
  afterContent: string;
  /** CSS selector of the element to capture. */
  selector: string;
  /** Directory to write before.png / after.png. */
  outDir: string;
  viewport?: { width: number; height: number };
}

async function renderState(
  browser: Browser,
  opts: RenderOpts,
  content: string,
  outPng: string,
): Promise<void> {
  const sandbox = await mkdtemp(path.join(tmpdir(), "drift-"));
  try {
    await cp(opts.appDir, sandbox, { recursive: true });
    await writeFile(path.join(sandbox, opts.changedRelToApp), content, "utf8");
    const page = await browser.newPage({
      viewport: opts.viewport ?? { width: 1200, height: 800 },
      deviceScaleFactor: 2,
    });
    await page.goto("file://" + path.join(sandbox, opts.previewRel), { waitUntil: "networkidle" });
    await page.waitForTimeout(150); // let fonts/transitions settle
    await page.locator(opts.selector).first().screenshot({ path: outPng });
    await page.close();
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
}

/** Render the component at HEAD and at the working state; return PNG paths + base64. */
export async function renderBeforeAfter(opts: RenderOpts): Promise<RenderResult> {
  await mkdir(opts.outDir, { recursive: true });
  const beforePng = path.join(opts.outDir, "before.png");
  const afterPng = path.join(opts.outDir, "after.png");

  const browser = await chromium.launch();
  try {
    await renderState(browser, opts, opts.beforeContent, beforePng);
    await renderState(browser, opts, opts.afterContent, afterPng);
  } finally {
    await browser.close();
  }

  const [b, a] = await Promise.all([readFile(beforePng), readFile(afterPng)]);
  return {
    beforePngPath: beforePng,
    afterPngPath: afterPng,
    beforePngBase64: b.toString("base64"),
    afterPngBase64: a.toString("base64"),
  };
}
