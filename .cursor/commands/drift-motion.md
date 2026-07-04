---
description: Review my last component edit IN MOTION (hover/transition) for design-system drift
---

Call the `drift_review` MCP tool on the component/style file I just edited, with `interaction: "hover"`.

- Use the most recently changed file under `sample-app/` as the `file` argument (default: `sample-app/components.css`).
- Show me the **before/after** motion frames and the **verdict** exactly as the tool returns them.
- If the verdict is an **accidental_regression**, apply the tool's proposed fix, then tell me in one line what drifted in the motion (duration / easing / distance) and what you changed.
- Otherwise, just summarize.
