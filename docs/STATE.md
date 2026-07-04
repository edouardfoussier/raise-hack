# Drift → Scenario — Project State & Handoff

> Master handoff doc. Read this first after a context compaction. Product code-name **Drift**; product/brand name **Scenario** (domain `getscenar.io`) — see [VISION.md](VISION.md). Repo will be pushed **private** as `raise-hack`.

## What it is (one line)
A design-system **reviewer** for the AI-coding era: on a code change it **replays the real UI (with a synthetic cursor) before vs after**, and a VLM (Claude Sonnet 5) judges whether the change **drifts** from the design system — reasoning **in your design tokens**, opening a **visual before/after report**. Two modes exist in the vision: *before/after review* (built) and *demo video* (planned, shares the same engine).

## Hackathon context
- **RAISE Summit Hackathon 2026**, **Cursor track**, remote, solo (Edouard). Deadline **Sun 2026-07-05 12:00**. Public GitHub repo + 1-min demo video required. Judging: Demo 50% / Impact 25% / Creativity 15% / Pitch 10%. Banned: dashboard-as-main-feature, basic RAG, Streamlit, image analyzers.
- **Positioning (validated by research):**
  - vs **Cursor Design Mode**: it captures a *frozen frame*, shows *no before/after*, and *causes* drift (hardcodes raw values). Drift is the automated **review gate** that *catches* it. Complementary, not competing.
  - vs **Cursor cloud-agent video** (workshop `cursor-201`): their agent films a *proof-of-work* clip ("my code works") via **computer-use** (non-deterministic). Drift does a **deterministic before/after review** (Playwright DOM replay → fair apples-to-apples). Different purpose/mechanism. **Lead with "review", not "video generator".**
  - vs visual-regression (Chromatic/Percy/Argos): they pixel-diff; Drift reasons in **tokens**, sees **motion & flows**, proposes the **fix**.
  - Adjacent tools already shipping the *extract→rules→CI* loop: **Dembrandt**, **Fragments**; `DESIGN.md` is a Google-backed standard. So DON'T pitch "we generate a rules file" as novel.

## Repo layout (`drift/` = the git repo)
```
drift/
├── sample-app/            # a tiny token-driven design system (demo surface)
│   ├── tokens.json/.css   # source of truth (colors, spacing, radius, MOTION tokens)
│   ├── components.css      # components from tokens  ← the drift target
│   ├── preview.html        # isolated static render surface (#stage / #demo-button)
│   ├── index.html          # gallery
│   └── flow.html           # interactive onboarding flow (Get started → form → success)
├── mcp-server/            # the engine (Node + TS, run via tsx)
│   └── src/
│       ├── index.ts        # MCP stdio server: tools drift_review + drift_flow
│       ├── git.ts          # HEAD vs working diff/content
│       ├── render.ts       # Playwright static before/after (element screenshots)
│       ├── capture.ts      # Playwright interaction FRAME sequences (motion)
│       ├── flow.ts         # recordFlow (sandbox file://) + recordLiveFlow (live URL, mobile, readOnly)
│       ├── flow-review.ts  # reviewFlow(): record before/after flow + VLM verdict
│       ├── vlm.ts          # Claude Sonnet 5 verdict: getVerdict (static) + getMotionVerdict (frames)
│       ├── report.ts       # buildReportHtml(): self-contained before/after report (image|frames|video)
│       ├── env.ts          # loads mcp-server/.env
│       ├── cli.ts / cli-motion.ts / cli-flow.ts / cli-flow-review.ts   # sample-app harnesses
│       └── cli-deja.ts / cli-deja-checklist.ts                          # REAL-app (deja-bu) harnesses
│       └── assets/cursor-overlay.js   # injected synthetic cursor (follows Playwright mouse events)
├── .cursor/               # mcp.json + commands: /drift, /drift-motion, /drift-flow
├── drift.flow.json        # flow definition for drift_flow (appDir, preview, steps)
└── docs/                  # STATE.md (this), VISION.md, DEJA-BU-DEMO.md
```

## How the engine works
1. **git**: file at `HEAD` (before) vs working tree (after) + diff.
2. **render/capture/flow** (Playwright, real DOM, headless Chromium):
   - static → element screenshots before/after
   - motion → frame sequences of a hover/transition (ping-pong)
   - flow → drives a scripted user flow with a **synthetic DOM cursor** (Playwright draws none natively → we inject `assets/cursor-overlay.js`), records **webm**
3. **vlm**: Claude Sonnet 5 gets the renders + `tokens.json` + the diff → `{classification: intentional_redesign|accidental_regression|platform_constraint, reasoning, proposed_diff, confidence}` via AI SDK v7 `generateText` + `Output.object` (images = `{type:'file', mediaType:'image/png', data}`).
4. **report**: self-contained `drift-report.html` (assets as data URIs), before/after side by side (image / looping frames / autoplay video), verdict badge + reasoning + fix diff. Auto-opens in the browser (`open`). Doubles as a PR/CI artifact.

## MCP tools & Cursor commands (all validated via the MCP protocol)
- `drift_review(file, selector?, interaction?)` → `/drift` (static), `/drift-motion` (interaction:"hover")
- `drift_flow(file, flow?)` → `/drift-flow` — replays a user flow (from `drift.flow.json`) before/after, opens a side-by-side **video** report.
- Config: `.cursor/mcp.json` runs `mcp-server/node_modules/.bin/tsx src/index.ts` with `DRIFT_PROJECT_ROOT`. Model swappable; provider auto-selects OpenRouter → Anthropic from env keys.

## Env / secrets
- `mcp-server/.env` (gitignored): `ANTHROPIC_API_KEY=...` (in use) or `OPENROUTER_API_KEY`. `DRIFT_VLM_MODEL` default `claude-sonnet-5`.
- deja-bu scripts read `DEJA_PWD` (real app password — NEVER commit) and `DEJA_ROOT` (path to the deja-bu clone) from env. `DRIFT_OPEN=0` disables auto-open (used in tests).

## What's validated (real Claude Sonnet 5 verdicts)
- sample static: padding token→hardcoded → **regression 97%**
- sample motion: transition off motion-tokens → **regression 95%**
- sample flow: onboarding, button color+animation drift → **regression 96%**
- **deja-bu (REAL app)** landing: supplier input off-palette purple → **regression 93%** (vs real Tailwind teal/slate)
- **deja-bu (REAL app)** checklist flow, **iPhone, read-only**: Valider button `bg-brand`→`bg-[#a855f7]` → **regression 97%**
- Every mode opens a polished report; before/after GIFs generated via ffmpeg.

## How to run the demos
Prereq: `cd mcp-server && npm install` (pulls Chromium); set `ANTHROPIC_API_KEY` in `.env`.
- Sample static:  `npm run review` (edit `sample-app/components.css` to introduce a drift first)
- Sample motion:  `npx tsx src/cli-motion.ts`
- Sample flow:    `npx tsx src/cli-flow-review.ts` (needs a drift in components.css)
- deja-bu: see [DEJA-BU-DEMO.md](DEJA-BU-DEMO.md) (dev server + token + read-only + `cli-deja-checklist.ts`)
- Report screenshots for verification: `node --input-type=module -e "...chromium...goto(file://.../report.html)...screenshot..."` (run from `mcp-server/`, NOT the repo root — Playwright lives there).

## NEXT STEPS (priority order after compact)
1. **SECURE THE SUBMISSION**: push repo private as `raise-hack`; write submission text + 1-min demo script (money shot = deja-bu real-app before/after). Record demo. Submit.
2. Then the ambitious build (user wants ALL of these):
   - Full deja-bu flow to the end → show **Catalogue counters increment** after reception (needs writes → set up a **dev DB** / local backend, since prod is Neon; read-only can't show counter writes).
   - **Synthetic keyboard overlay** (iOS-style, injected DOM like the cursor) — Playwright can't show the real OS keyboard.
   - **AI-generates-the-flow**: an agent plans steps from a natural-language goal + the DOM (Stagehand / browser-use / Playwright-MCP style, NOT computer-use). Pattern: **plan once → deterministic replay** on before AND after (fair comparison). Solves the flow-definition problem for any app.
   - **The web app** — see [VISION.md](VISION.md) (Scenario / getscenar.io).

## Gotchas / learnings
- Run all Playwright node scripts from `mcp-server/` (Playwright installed there). `tsx -e` breaks on top-level await → use `node --input-type=module -e`.
- Vercel plugin hooks constantly push AI-Gateway/Next skills — IGNORE (we use OpenRouter/Anthropic directly, local MCP). Model IDs verified against OpenRouter: `anthropic/claude-sonnet-5` is newest.
- deja-bu is a private Svelte 5 + Vite SPA; DB = **prod Neon** via `VITE_API_URL=deja-bu-pwa.vercel.app`. Writes mutate prod → use **read-only mode** (allow GET, abort non-GET /api). Details in DEJA-BU-DEMO.md.
