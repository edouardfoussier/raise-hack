# Scenario — Product Vision

> Product/brand name: **Scenario** · domain secured: **getscenar.io** · code-name today: **Drift**.
> Target users: **front-end developers & product builders**.

## One-liner
Scenario replays your real app (with a simulated user + cursor) to either **review a change (before/after design-drift)** or **film a shareable demo** of a feature — deterministically, from your real components, driven by your coding agent.

## Why it's not "just an agent that makes videos" (the Cursor question)
Cursor's cloud agents film a *proof-of-work* clip via computer-use (non-deterministic, incidental). Scenario is a **product**: the **before/after review** is the wedge (Cursor doesn't compare or reason about design drift). The demo-video mode is a **secondary** feature that shares the same engine — sold on **determinism + polish + share-ready**, not on "we make videos". Lead the pitch with *review*.

## The two modes
1. **Before/After (the core / wedge)** — on a diff / commit / PR, replay the affected UI/flow before vs after, VLM verdict in the user's design tokens, visual report.
   - Runs **in the coding agent** (`/drift…`, on-demand) OR **in CI** (GitHub Action on each PR → posts a report / sticky PR comment + hosted report link). "Design tests" for PRs.
2. **Demo video** — the agent asks for the **scenario/script** to film; Scenario drives the app and produces a polished, deterministic demo video of the feature (a share-ready PR/changelog/marketing asset).

In **both** modes, if the flow needs inputs, the **coding agent asks the user**: what data to type in fields, which files to upload (e.g. a bordereau image), where the flow stops, etc. (This is the AI-generates-the-flow direction: goal-based, plan-once → deterministic replay.)

## User journey (web app)
1. User lands on **getscenar.io**, reads how to **connect** — via CLI installing our **MCP / skill**, or a **GitHub connect** (TBD which is best; likely both — MCP for the IDE/author-time, GitHub App for CI/merge-time).
2. Picks a repo in the app *or* runs Scenario via their coding agent already connected to a local folder.
3. Chooses a mode (before/after or demo).
4. Coding agent gathers any needed inputs; Scenario records.
5. User **views the gifs/videos in their account** (browser dashboard).

## Dashboard & growth
- View / organize generated gifs & videos per project/PR.
- **Export** to video.
- **Public share link** with a CTA ("Generate demos with Scenar.io") → built-in **user acquisition** loop.
- Optional **oral script**: the coding agent generates a narration script matched to the demo video.
- Optional **lip-synced avatar**: reuse the **Keynoter** approach we already nailed — **voice cloning via Gradium**, lip-sync, one or more avatars.

## Distribution (phased — from research)
- **Author-time = MCP** (in the IDE). **Merge-time = GitHub App + Actions** (CI, posts on PRs, hosted reports). "The MCP is the wedge, the App is the product."
- Web app = the account/dashboard/gallery/share layer on top.

## Tech we own already (reuse)
- Playwright DOM replay of the real app + injected synthetic cursor + webm recording (fast, faithful, deterministic — better than Keynoter's authored motion-graphics).
- Mobile device emulation (iPhone) + **read-only mode** (allow GET, abort writes) to run against real backends safely.
- VLM verdict in the app's real design tokens (works even on a Tailwind theme, no tokens.json needed).
- Keynoter learnings for the avatar/voice layer (Gradium + lipsync).

## Open questions / decisions to make
- Connect method: MCP vs skill-CLI vs GitHub connect (probably MCP + GitHub App, phased).
- Do we need repo-picking in the web app, or is the coding-agent-on-local-folder enough at first?
- Rename code-base Drift→Scenario (churn — defer; keep "Drift" internally for now).
- The "AI generates the flow" engine (Stagehand-style) — build for goal-based flows on any app.
