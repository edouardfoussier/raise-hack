---
description: Review my last change across the whole user flow (before/after videos)
---

Call the `drift_flow` MCP tool on the file I just edited (default: `sample-app/components.css`).

It replays the app's user flow — defined in `drift.flow.json` — before (last commit) and after my change, with a simulated moving cursor, then opens a **side-by-side video report** where both flows play on loop.

- Show me the verdict exactly as the tool returns it.
- If it's an **accidental_regression**, apply the tool's proposed fix and tell me in one line what drifted across the flow.
- Otherwise, just summarize.
