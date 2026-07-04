# Drift 🎯

**The design-system reviewer that Cursor's Design Mode is missing.**

Drift is an [MCP](https://modelcontextprotocol.io) server for Cursor that reviews a UI change for **design-system drift**. Right after an edit, it renders the affected component **before** (last commit) and **after** (your change), and a vision model (Claude Sonnet 5) judges whether the change is an *intentional redesign*, an *accidental regression*, or a *platform constraint* — **reasoning in your design system's own language** (tokens, spacing scale, motion) and proposing the fix. It even reviews the component **in motion** (hover / transition), which a single frozen screenshot can't.

Built at the **RAISE Summit Hackathon 2026** — Cursor track.

---

## Why — complementary to Cursor Design Mode, not a competitor

Cursor's **Design Mode** lets you point / draw / talk to edit UI. But it captures a **frozen frame**, shows **no before/after**, and — per [Cursor's own docs](https://cursor.com/docs/agent/design-mode) and [Builder.io's analysis](https://www.builder.io/blog/cursor-design-mode-visual-editing) — frequently **hardcodes raw values off your design system** (*"outputs raw values instead of your design system"*, *"generates a brand new button with inline styles"*). The recommended safeguard is literally *"add a human review gate."*

**Drift is that review gate — automated.** Design Mode *causes* drift; Drift *catches* it.

| | Cursor Design Mode | **Drift** |
|---|---|---|
| Role | point-and-describe **editor** | autonomous **reviewer** |
| Before / after | ❌ frozen single frame | ✅ rendered before vs after |
| Reasons in tokens | ❌ often hardcodes raw values | ✅ names the token / scale it breaks |
| Animations & interactive states | ❌ frozen frame | ✅ reviews hover / transition **in motion** |
| The fix | you re-prompt | ✅ proposes the diff to apply |

---

## How it works

`/drift` (static) or `/drift-motion` (hover / transition) → the **`drift_review`** MCP tool runs a 4-step loop, entirely local:

1. **git** — reads the file at `HEAD` (before) vs the working tree (after), plus the diff.
2. **render** — Playwright renders the component in isolation at both states → PNGs (static), or **frame sequences of the interaction** (motion).
3. **judge** — Claude Sonnet 5 receives the renders + your `tokens.json` + the diff, and returns `{ classification, reasoning, proposed_diff, confidence }` written in your design system's language.
4. **review & fix** — Drift opens a self-contained visual **before/after report** in your browser (for motion drift, the interaction **plays on loop** — before vs after side by side), and returns the verdict + diff **inline in Cursor's chat**; accept → the agent applies the fix. The same report is your PR/CI artifact.

No dashboard. The model provider is swappable (OpenRouter for the hackathon credits, or Anthropic directly).

**Example verdict** (real output, on a hover-transition regression):

> **Accidental regression · 95%** — *The transition hardcodes `all 450ms linear` instead of `var(--motion-fast)` (120ms) and `var(--ease-standard)`. That's ~4× the token duration and swaps the ease-out curve for linear — a sluggish, mechanical hover instead of the crisp feel the system defines. The lift also jumped from -1px to -6px, an off-scale magic number...*

---

## Setup

```bash
# 1. Install (pulls deps + Chromium)
cd mcp-server && npm install

# 2. Add a vision-model key
cp .env.example .env
#   set OPENROUTER_API_KEY=...   (or ANTHROPIC_API_KEY=...)
```

3. **Point Cursor at it** — `.cursor/mcp.json` registers the `drift` MCP server (adjust the absolute paths for your machine). Reload Cursor; the `drift_review` tool and the `/drift` + `/drift-motion` commands appear.

4. **Review a change** — edit a component (e.g. `sample-app/components.css`), then run **`/drift`** (static) or **`/drift-motion`** (in motion).

---

## Repo layout

```
drift/
├── sample-app/          # a tiny token-driven design system to demo on
│   ├── tokens.json      # the source of truth Drift reasons against
│   ├── tokens.css       # CSS-variable surface (colors, spacing, radius, motion)
│   ├── components.css   # components styled strictly from tokens  ← the drift target
│   └── preview.html     # isolated render surface
├── mcp-server/          # the Drift MCP server
│   └── src/
│       ├── index.ts     # MCP stdio server, the drift_review tool
│       ├── git.ts       # HEAD vs working-tree diff
│       ├── render.ts    # Playwright static before/after
│       ├── capture.ts   # Playwright interaction frame sequences (motion)
│       └── vlm.ts       # Claude Sonnet 5 verdict (static + motion) via the AI SDK
└── .cursor/             # mcp.json + /drift, /drift-motion commands
```

**Stack:** Node + TypeScript · Model Context Protocol SDK · Playwright · Vercel AI SDK · Claude Sonnet 5.

---

## Built during the hackathon

Everything in this repo was built at RAISE 2026: the MCP server, the static + motion render/capture engines, the VLM prompting, the sample design system, and the Cursor integration. `sample-app/` is a demo surface; point Drift at any repo with design tokens and a component preview.
