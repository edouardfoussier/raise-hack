/**
 * WRITE-MODE demo on the REAL deja-bu DEV DB (Vercel preview behind SSO):
 *   1. Catalogue → read a product's stock (touch cursor + iOS keyboard search)
 *   2. Perform a real réception (POST /api/stock_movements — the same write the app
 *      does at clôture) that adds N units to reserve
 *   3. reload → Catalogue → the stock counter has incremented
 * Verified against the DB (GET before/after). DEV DB only — never prod.
 *
 *   DEJA_URL=<preview-url> DEJA_BYPASS=<vercel-bypass> DEJA_PWD=<app-pwd> \
 *     npx tsx src/cli-deja-stock.ts
 */
import "./env.js";
import path from "node:path";
import { mkdir, rm, rename, cp, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { chromium, devices, type Page } from "playwright";

const pexec = promisify(exec);
const ASSETS = path.resolve(process.cwd(), "assets");
const TAP = path.join(ASSETS, "tap-overlay.js");
const KB = path.join(ASSETS, "keyboard-overlay.js");

const URL = process.env.DEJA_URL || "https://deja-bu-npi9s11fh-edouard-foussiers-projects.vercel.app";
const BYPASS = process.env.DEJA_BYPASS || "";
const PWD = process.env.DEJA_PWD || "";
const PRODUCT = process.env.DEJA_PRODUCT || "ACCENT GINGER";
const DELTA = Number(process.env.DEJA_DELTA || 12);
const OUT = path.resolve(process.cwd(), "..", ".drift-cache", "deja-stock");
if (!BYPASS) console.warn("⚠ DEJA_BYPASS not set — the Vercel SSO wall will block the app.");
if (!PWD) console.warn("⚠ DEJA_PWD not set — the app will show a login screen.");

const H: Record<string, string> = {
  "x-vercel-protection-bypass": BYPASS,
  Authorization: `Bearer ${PWD}`,
  "Content-Type": "application/json",
};
async function getStock(): Promise<{ id: string; name: string; stock: number; reserve: number }> {
  const j = (await (await fetch(URL + "/api/products", { headers: H })).json()) as { items: any[] };
  const p = j.items.find((x) => new RegExp(PRODUCT, "i").test(x.canonical_name));
  if (!p) throw new Error(`product not found: ${PRODUCT}`);
  return { id: p.id, name: p.canonical_name, stock: p.current_stock, reserve: p.stock_reserve };
}
async function receive(product_id: string, value: number): Promise<any> {
  const body = {
    source_kind: "reception",
    source_id: crypto.randomUUID(),
    movements: [{ product_id, location: "reserve_units", operation: "add", value }],
  };
  const r = await fetch(URL + "/api/stock_movements", { method: "POST", headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`stock POST ${r.status}`);
  return r.json();
}

async function moveTo(page: Page, selector: string): Promise<void> {
  const loc = page.locator(selector).first();
  await loc.scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {});
  const box = await loc.boundingBox({ timeout: 6000 });
  if (!box) throw new Error(`not found: ${selector}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 26 });
}
async function tap(page: Page, selector: string): Promise<void> {
  await moveTo(page, selector);
  await page.waitForTimeout(120);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
  await page.waitForTimeout(380);
}
async function searchProduct(page: Page): Promise<void> {
  try {
    await tap(page, 'input[type="search"]');
    await page.locator('input[type="search"]').first().fill("");
    await page.keyboard.type(PRODUCT, { delay: 65 }); // ⌨ iOS keyboard
    await page.waitForTimeout(1400);
    await moveTo(page, `button:has-text(${JSON.stringify(PRODUCT)})`).catch(() => {});
  } catch (e) {
    console.error("  (search step skipped:", (e as Error).message.split("\n")[0], ")");
  }
}

const before = await getStock();
console.log(`baseline: ${before.name} = ${before.stock} en stock (réserve ${before.reserve})`);

await mkdir(OUT, { recursive: true });
const videoDir = await mkdtemp(path.join(tmpdir(), "deja-stock-"));
const browser = await chromium.launch();
const dev = devices["iPhone 13"];
try {
  const context = await browser.newContext({
    ...dev,
    recordVideo: { dir: videoDir, size: dev.viewport },
    extraHTTPHeaders: BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {},
  });
  await context.addInitScript({ path: TAP });
  await context.addInitScript({ path: KB });
  await context.addInitScript(`try{localStorage.setItem('deja-bu:v1:auth-token', JSON.stringify(${JSON.stringify(PWD)}));}catch(e){}`);
  const page = await context.newPage();

  // BEFORE — Catalogue, read the product's stock
  await page.goto(URL + "#/catalogue", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2600);
  await page.mouse.move(dev.viewport.width * 0.5, dev.viewport.height * 0.9, { steps: 1 });
  await searchProduct(page);
  await page.waitForTimeout(2000); // hold on the BEFORE number

  // THE RÉCEPTION — real write to the dev DB
  console.log(`⧗ réception: +${DELTA} × ${before.name} → POST /api/stock_movements`);
  const res = await receive(before.id, DELTA);
  console.log("  applied:", JSON.stringify(res.applied?.[0] ?? res).slice(0, 140));
  await page.waitForTimeout(700);

  // Bust the offline products cache, then do a REAL reload (new document) so the
  // store re-inits with no cache and refetches fresh stock. A same-URL goto that
  // only changes the hash does NOT reload — the in-memory store keeps the old value.
  await page.evaluate(() => localStorage.removeItem("deja-bu:v1:products"));

  // AFTER — reload, Catalogue, the counter has moved
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3200);
  await searchProduct(page);
  await page.waitForTimeout(2600); // hold on the AFTER number

  const video = page.video();
  await context.close();
  if (video) {
    const src = await video.path();
    await rename(src, path.join(OUT, "stock.webm")).catch(async () => { await cp(src, path.join(OUT, "stock.webm")); });
  }
} finally {
  await browser.close();
  await rm(videoDir, { recursive: true, force: true });
}

const after = await getStock();
const delta = after.stock - before.stock;
console.log(`\nRESULT: ${before.name}  ${before.stock} → ${after.stock}  (Δ ${delta}, attendu +${DELTA})`);
console.log(delta === DELTA ? "✓ stock incrémenté comme attendu sur la DB de dev" : "⚠ delta inattendu (run concurrent ?)");

const gif = path.join(OUT, "stock.gif");
await pexec(
  `ffmpeg -y -i "${path.join(OUT, "stock.webm")}" -vf "fps=12,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${gif}"`,
);
console.log(`✓ webm: ${path.join(OUT, "stock.webm")}\n✓ gif:  ${gif}`);
