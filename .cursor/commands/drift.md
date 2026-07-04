---
description: Review my last component edit for design-system drift
---

Call the `drift_review` MCP tool on the component/style file I just edited.

- Use the most recently changed file under `sample-app/` as the `file` argument (default: `sample-app/components.css`).
- Show me the **before/after** renders and the **verdict** exactly as the tool returns them.
- If the verdict is an **accidental_regression**, apply the tool's proposed fix to that file, then tell me in one line what drifted and what you changed.
- If it's an **intentional_redesign** or **platform_constraint**, just summarize — don't change code.
