# Running Drift on the REAL deja-bu app (method + learnings)

> How we proved Drift on Edouard's real client app. deja-bu = private **Svelte 5 + Vite SPA** PWA (beverage shop: catalogue / inventaire / réception / historique). Repo (his): `github.com/edouardfoussier/deja-bu` (private) and locally `/Users/edouardfoussier/code/deja-bu`. We cloned it into the session scratchpad and ran it locally.

## Key facts
- Client-side Vite SPA. `cd app && pnpm install && pnpm dev` → `http://localhost:5173`. Deps minimal.
- **DB = PROD Neon** (backend on Vercel). Frontend `.env`: `VITE_API_URL=https://deja-bu-pwa.vercel.app`. So the local dev app talks to **prod backend/DB**. **Writes mutate prod.**
- **Password gate** (client): `App.svelte` optimistic auth. Token key `deja-bu:v1:auth-token` (JSON-stringified) in localStorage. `isAuthenticated = validated && !!token`, `validated = !!token` at boot → **any token renders the shell**. The token IS the password; validated against prod via `GET /api/vision`.
- No GitHub PRs — Edouard commits directly to `main` (each push redeploys). "Last PR" = a recent commit; the rich recent visual work is in the **checklist** (post-scan), reachable via resuming a paused session.

## Safe recording modes (choose per need)
- **Read-only (SAFE, no prod writes, no cleanup):** the app is offline-first. Allow `GET /api` (real data reads), **abort** all non-GET `/api` (writes queue locally, never leave the browser). Implemented in `recordLiveFlow({ readOnly: true })` and the deja scripts. This is what we use.
- **Fake token (no login, empty app):** set `deja-bu:v1:auth-token` = `"demo"` + block ALL `/api` → renders the landing shell only (no data). Used for the very first landing demo.
- **Full writes (LATER):** to show real mutations (e.g. **Catalogue counters incrementing** after a reception), run the **backend locally** against a throwaway Postgres (`DATABASE_URL=postgresql+asyncpg://...@localhost:5432/dejabu`, backend has alembic migrations) and point `VITE_API_URL` at it. Isolated from prod Neon. NOT yet done.

## Reaching real screens
- **Landing** (Réception): renders with just a token. Supplier input visible = `#cl-supplier` (in `ChecklistStart.svelte`; NOT `#r-supplier` which is conditional). Photo button = `button:has-text("Photographier")`.
- **Checklist** (rich, line-by-line verify): resume a paused session → `button:has-text("Reprendre")` (there are ~3 real paused sessions). Lands on a `ChecklistLineCard` ("VÉRIFICATION · LIGNE n/m", teal `bg-brand` "✅ Valider" / "✎ Corriger la quantité" / "🚫 Rien reçu" / "Voir le récap →"). Recap = `ChecklistRecap` (CONFORMES / REÇUS HORS BORDEREAU / "Terminer la réception").
- **Bordereau upload** triggers `/api/vision` OCR (needs valid login + prod). `setInputFiles` on `input[type=file]` — was flaky; **resuming a paused session is the reliable path** to the checklist. Photo of a carton to scan: `IMG_564.JPG` at repo root (for the scan-a-carton flow, future).

## The scripts
- `mcp-server/src/cli-deja.ts` — landing before/after, fake token, blockApi. Representative drift on `#cl-supplier`.
- `mcp-server/src/cli-deja-checklist.ts` — **checklist flow before/after, iPhone emulation, read-only login**. Reads `DEJA_PWD` + `DEJA_ROOT` from env. Drift = Valider button `bg-brand → bg-[#a855f7]` (off-palette) via string-replace in `ChecklistLineCard.svelte`, `git checkout` to revert. Verdict fed the real Tailwind theme (brand teal #14b8a6 + slate) as the design system.
- Run: dev server up, then `cd mcp-server && DEJA_PWD='<pwd>' DEJA_ROOT='<clone path>' DRIFT_OPEN=0 npx tsx src/cli-deja-checklist.ts`. Verify by screenshotting `.drift-cache/deja-checklist/deja-checklist-report.html` (screenshot at t≈0 shows the landing; the checklist + drift appears mid-video — check `af/` late frames: teal vs purple Valider).

## Learnings
- Playwright emulates mobile (viewport/touch/DPR) but **NOT the real iOS keyboard** (OS element). To show a keyboard: inject a synthetic overlay (like the cursor). A **tap-ripple** indicator suits mobile better than an arrow cursor.
- `recordLiveFlow` steps are tolerant of missing selectors (logs + continues) — good for real apps.
- The synthetic cursor works even in mobile contexts because we drive via `page.mouse.*` (mouse events), which the overlay listens to.
