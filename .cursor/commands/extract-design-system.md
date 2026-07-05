---
description: Extract your app's live design system into Scenario (from a URL)
---

Connect the running app to Scenario by extracting its **live design system** from a URL.

Take the URL I give as the argument (default: the app's production URL, e.g. `https://thesphinx.ai`). From `mcp-server/`, run:

```
EXTRACT_URL=<url> npx tsx src/cli-extract.ts
```

It drives a headless browser over the URL via **dembrandt** and prints the extracted design system: brand colors (hex + role), the typography scale (font families + sizes), the spacing scale, motion tokens, breakpoints, and a component count.

- Show me the extracted **design-system summary** exactly as the CLI prints it.
- End with the one-line headline (`N colors · N text styles · N breakpoints · N components`) and frame it as *"this is your app's live design system in Scenario — edit a component, then `/drift` to review your change against these tokens."*
- If the extraction fails (the site blocks automation, times out, or serves no styles), report the clean error the CLI prints and suggest retrying with `EXTRACT_SLOW=1` or a different page — don't invent tokens.
