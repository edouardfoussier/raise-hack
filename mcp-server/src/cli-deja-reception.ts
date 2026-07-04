/**
 * FULL RÉCEPTION STORY demo on the REAL deja-bu DEV DB (Vercel preview behind SSO).
 * One continuous mobile video that shows WHY a product's stock goes up:
 *
 *   1. Catalogue → search the product → note its stock (BEFORE)
 *   2. Réception → open a seeded delivery (bordereau) → the checklist →
 *      ✅ Valider the line → Terminer (clôture) — the REAL app write happens
 *      here via applyStockMovements('reception', …) → POST /api/stock_movements
 *   3. Catalogue → same product → stock INCREMENTED (AFTER)
 *
 * We SEED a fresh paused delivery_session (localStorage `delivery-paused` +
 * POST /api/delivery_sessions) so the checklist's "▶ Reprendre" list has a
 * real line to drive to clôture. The stock write is done by the app itself at
 * Terminer — we only verify it against the DB (GET /api/products before/after).
 * DEV DB only — never prod.
 *
 *   DEJA_URL=<preview-url> DEJA_BYPASS=<vercel-bypass> DEJA_PWD=<app-pwd> \
 *     npx tsx src/cli-deja-reception.ts
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
const CAP = path.join(ASSETS, "caption-overlay.js");

const URL = process.env.DEJA_URL || "https://deja-bu-npi9s11fh-edouard-foussiers-projects.vercel.app";
const BYPASS = process.env.DEJA_BYPASS || "";
const PWD = process.env.DEJA_PWD || "";
// Target product (clean data, upp=12): 1 carton reçu → +12 units on the counter.
const PRODUCT = process.env.DEJA_PRODUCT || "ACCENT GINGER";
const CARTONS = Number(process.env.DEJA_CARTONS || 1);
const SUPPLIER = process.env.DEJA_SUPPLIER || "Distridrink (démo Scenario)";
const OUT = path.resolve(process.cwd(), "..", ".drift-cache", "deja-reception");
if (!BYPASS) console.warn("⚠ DEJA_BYPASS not set — the Vercel SSO wall will block the app.");
if (!PWD) console.warn("⚠ DEJA_PWD not set — the app will show a login screen.");

const H: Record<string, string> = {
  "x-vercel-protection-bypass": BYPASS,
  Authorization: `Bearer ${PWD}`,
  "Content-Type": "application/json",
};

type Prod = { id: string; name: string; upp: number; stock: number; boutique: number; reserve: number };
async function getProduct(): Promise<Prod> {
  const j = (await (await fetch(URL + "/api/products", { headers: H })).json()) as { items: any[] };
  const p = j.items.find((x) => new RegExp(PRODUCT, "i").test(x.canonical_name));
  if (!p) throw new Error(`product not found: ${PRODUCT}`);
  return {
    id: p.id,
    name: p.canonical_name,
    upp: p.units_per_pack || 1,
    stock: p.current_stock,
    boutique: p.stock_boutique,
    reserve: p.stock_reserve,
  };
}

/** Build a fresh paused delivery session with ONE bordereau line linked to the
 *  target product. Shape mimics a real dev session (flat DeliverySession). The
 *  line is `checked:false` so it shows the "✅ Valider" screen in the checklist. */
function makeSession(prod: Prod) {
  const now = new Date().toISOString();
  const sessionId = crypto.randomUUID();
  const lineId = crypto.randomUUID();
  const session = {
    id: sessionId,
    supplier: SUPPLIER,
    notes: "",
    started_at: now,
    paused_at: now,
    items: [] as any[],
    expected_unit: "carton",
    destination: "reserve",
    bordereau_meta: {
      fournisseur: SUPPLIER,
      date: now.slice(0, 10),
      numero: "BL-" + Math.floor(Math.random() * 9000 + 1000),
    },
    expected_items: [
      {
        id: lineId,
        nom: prod.name,
        quantite: CARTONS,
        unite_quantite: "carton",
        bouteilles_par_colis: prod.upp,
        reference: null,
        confiance: "haute",
        scanned_cartons: 0,
        fulfilled: false,
        product_id: prod.id,
        checked: false,
      },
    ],
  };
  return session;
}

/** Persist the seeded session to the DB so it survives refreshHistoryFromServer
 *  (paused_at set, finished_at null → lands in `deliveries.paused`). Best-effort;
 *  the localStorage seed is what actually drives the UI. */
async function seedSessionInDb(session: any): Promise<void> {
  const r = await fetch(URL + "/api/delivery_sessions", {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      id: session.id,
      started_at: session.started_at,
      finished_at: null,
      supplier: session.supplier,
      payload: session,
    }),
  });
  if (!r.ok) console.warn(`  (DB seed POST ${r.status} — relying on localStorage seed)`);
  else console.log("  seeded session in DB:", session.id);
}

async function moveTo(page: Page, selector: string): Promise<void> {
  const loc = page.locator(selector).first();
  await loc.scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {});
  const box = await loc.boundingBox({ timeout: 6000 });
  if (!box) throw new Error(`not found: ${selector}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 36 });
}
async function tap(page: Page, selector: string): Promise<void> {
  await moveTo(page, selector);
  await page.waitForTimeout(120);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
  await page.waitForTimeout(420);
}
async function tapText(page: Page, text: string): Promise<void> {
  await tap(page, `button:has-text(${JSON.stringify(text)})`);
}

async function searchProduct(page: Page): Promise<void> {
  try {
    await tap(page, 'input[type="search"]');
    await page.locator('input[type="search"]').first().fill("");
    await page.keyboard.type(PRODUCT, { delay: 85 }); // ⌨ iOS keyboard
    await page.waitForTimeout(1500);
  } catch (e) {
    console.error("  (search step skipped:", (e as Error).message.split("\n")[0], ")");
  }
}

/** Update the synchronized caption banner (Scenario overlay). */
async function cap(page: Page, text: string): Promise<void> {
  await page.evaluate((t) => (window as any).__cap?.(t), text).catch(() => {});
}

// ── run ────────────────────────────────────────────────────────────────────
const before = await getProduct();
const expectedDelta = CARTONS * before.upp;
console.log(`baseline: ${before.name} = ${before.stock} en stock (réserve ${before.reserve}, upp ${before.upp})`);
console.log(`plan: ${CARTONS} carton × ${before.upp} = +${expectedDelta} attendu → ${before.stock + expectedDelta}`);

const session = makeSession(before);
console.log(`⧗ seeding paused réception « ${SUPPLIER} » → 1 ligne: ${CARTONS} crt de ${before.name}`);
await seedSessionInDb(session);

await mkdir(OUT, { recursive: true });
const videoDir = await mkdtemp(path.join(tmpdir(), "deja-reception-"));
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
  await context.addInitScript({ path: CAP });
  await context.addInitScript(`try{localStorage.setItem('deja-bu:v1:auth-token', JSON.stringify(${JSON.stringify(PWD)}));}catch(e){}`);
  // Seed the paused delivery into localStorage BEFORE the store constructs.
  await context.addInitScript(
    `try{localStorage.setItem('deja-bu:v1:delivery-paused', JSON.stringify(${JSON.stringify([session])}));}catch(e){}`,
  );
  const page = await context.newPage();

  // ── ACT 1 — Catalogue : the BEFORE stock ──────────────────────────────────
  await page.goto(URL + "#/catalogue", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2800);
  await cap(page, "① Check the product's current stock");
  await page.mouse.move(dev.viewport.width * 0.5, dev.viewport.height * 0.9, { steps: 1 });
  await page.waitForTimeout(800);
  await searchProduct(page);
  await cap(page, `${before.name} — ${before.stock} in stock`);
  await page.waitForTimeout(2600); // hold on the BEFORE number

  // ── ACT 2 — Réception : open the seeded bordereau → checklist → clôture ────
  await page.goto(URL + "#/reception", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2600); // ChecklistStart shows the "en attente" list
  await cap(page, `② Receive the delivery — ${CARTONS} carton on the slip`);
  await page.waitForTimeout(1000);
  // Reprendre → resumes the paused session into the active checklist
  await tapText(page, "Reprendre").catch(async () => {
    await tapText(page, "▶ Reprendre").catch(() => console.error("  (Reprendre not found)"));
  });
  await page.waitForTimeout(2200); // ChecklistLineCard — "Vérifie qu'il y a bien N cartons de …"
  await cap(page, "Checklist — verify each line against the slip");
  await page.waitForTimeout(1000);
  // ✅ Valider the line
  await tapText(page, "Valider").catch(() => console.error("  (Valider not found)"));
  await page.waitForTimeout(1600); // → recap view (single-line session advances to recap)
  await cap(page, "Line validated ✓ — closing the reception");
  await page.waitForTimeout(900);
  // Terminer / clôture — the REAL stock write happens here
  await tapText(page, "Terminer").catch(async () => {
    await tapText(page, "Clôturer").catch(() => console.error("  (Terminer not found)"));
  });
  await page.waitForTimeout(2600); // toast "Réception terminée ✓" + products.refresh()

  // ── ACT 3 — Catalogue : the AFTER stock ───────────────────────────────────
  // Bust the offline products cache, then a REAL reload (new document) so the
  // store re-inits with no cache and refetches fresh stock.
  await page.evaluate(() => localStorage.removeItem("deja-bu:v1:products"));
  await page.goto(URL + "#/catalogue", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3200);
  await cap(page, `③ Stock updated — ${before.name}`);
  await searchProduct(page);
  await cap(page, `${before.stock} → ${before.stock + expectedDelta} in stock ✓`);
  await page.waitForTimeout(3200); // hold on the AFTER number

  const video = page.video();
  await context.close();
  if (video) {
    const src = await video.path();
    await rename(src, path.join(OUT, "reception.webm")).catch(async () => {
      await cp(src, path.join(OUT, "reception.webm"));
    });
  }
} finally {
  await browser.close();
  await rm(videoDir, { recursive: true, force: true });
}

const after = await getProduct();
const delta = after.stock - before.stock;
console.log(`\nRESULT: ${before.name}  ${before.stock} → ${after.stock}  (Δ ${delta}, attendu +${expectedDelta})`);
console.log(delta === expectedDelta ? "✓ stock incrémenté à la clôture, vérifié sur la DB de dev" : "⚠ delta inattendu (clôture ratée ? run concurrent ?)");

const gif = path.join(OUT, "reception.gif");
await pexec(
  `ffmpeg -y -i "${path.join(OUT, "reception.webm")}" -vf "fps=12,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${gif}"`,
);
console.log(`✓ webm: ${path.join(OUT, "reception.webm")}\n✓ gif:  ${gif}`);
