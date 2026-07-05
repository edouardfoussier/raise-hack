/**
 * Diffender — "connect your live app" brick (CLI).
 *
 *   URL  →  dembrandt (headless browser extraction)  →  design-system JSON
 *   →  clean console summary (brand colors / type scale / spacing / motion /
 *      breakpoints / component count).
 *
 * This is the "extracted design system" a coding agent shows when you connect
 * your running app to Diffender — the same tokens Drift then reviews your edits
 * against. Runs entirely through `npx dembrandt` (no extra deps here).
 *
 *   EXTRACT_URL=https://thesphinx.ai npx tsx src/cli-extract.ts
 *   npx tsx src/cli-extract.ts https://thesphinx.ai
 *
 * Env / args:
 *   EXTRACT_URL   — the URL to extract (or pass it as the first CLI argument)
 *   EXTRACT_DARK  — set to "1" to extract dark-mode colors (--dark-mode)
 *   EXTRACT_SLOW  — set to "1" for slow-loading sites (--slow, 3x timeouts)
 *
 * On failure (site blocks automation, network error, no JSON produced) it
 * prints a clean, human message and exits non-zero — never a raw stack trace.
 */
import "./env.js";
import { readFileSync, existsSync } from "node:fs";
import { normalizeUrl, runDembrandt, findLatestJson, buildSummary } from "./extract.js";

function fail(msg: string): never {
  console.error("\n✗ " + msg);
  process.exit(1);
}

const URL_ARG = process.env.EXTRACT_URL || process.argv[2];
if (!URL_ARG || URL_ARG.startsWith("-")) {
  fail(
    "No URL given.\n" +
      "  Usage:  EXTRACT_URL=https://your-app.com npx tsx src/cli-extract.ts\n" +
      "     or:  npx tsx src/cli-extract.ts https://your-app.com",
  );
}
const targetUrl = normalizeUrl(URL_ARG);

async function main(): Promise<void> {
  console.error(`⧗ extracting design system from ${targetUrl} …\n`);

  let code = 0;
  try {
    // Mirror dembrandt's live progress to stderr so the run feels alive.
    ({ code } = await runDembrandt(targetUrl, {
      cwd: process.cwd(),
      dark: process.env.EXTRACT_DARK === "1",
      slow: process.env.EXTRACT_SLOW === "1",
      onOutput: (s) => process.stderr.write(s),
    }));
  } catch (e) {
    fail(
      `Could not launch dembrandt (${(e as Error).message}).\n` +
        "  Check your network / that npx can reach the registry, then retry.",
    );
  }

  const jsonPath = findLatestJson(targetUrl, process.cwd());
  if (!jsonPath || !existsSync(jsonPath)) {
    fail(
      `Extraction did not produce a design-system JSON for ${targetUrl}.\n` +
        "  The site likely blocked automated access, timed out, or served no styles.\n" +
        "  Try again with EXTRACT_SLOW=1 (slow sites), or extract a different page/URL.",
    );
  }

  let json: any;
  try {
    json = JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch (e) {
    fail(`Extracted file at ${jsonPath} was not valid JSON (${(e as Error).message}).`);
  }

  const { text } = buildSummary(json, jsonPath, targetUrl, "ansi");
  console.log("\n" + text + "\n");

  if (code !== 0) {
    console.error(`\x1b[2m(dembrandt exited with code ${code}, but a design-system JSON was produced and parsed.)\x1b[0m`);
  }
}

main().catch((e) => fail(`Extract failed: ${(e as Error).message}`));
