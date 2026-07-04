import "./env.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { chromium } from "playwright";
import { z } from "zod";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { getRepoRoot, getHeadContent, getWorkingContent, getDiff, toRepoRel } from "./git.js";
import { renderBeforeAfter } from "./render.js";
import { captureInteractionFrames } from "./capture.js";
import { getVerdict, getMotionVerdict } from "./vlm.js";
import { buildReportHtml, writeAndOpenReport, type Visual } from "./report.js";
import type { DriftVerdict } from "./types.js";

type Content =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

const LABEL: Record<string, string> = {
  intentional_redesign: "Intentional redesign",
  accidental_regression: "Accidental regression",
  platform_constraint: "Platform constraint",
};

const dataUri = (b64: string) => `data:image/png;base64,${b64}`;

function headline(v: DriftVerdict): string {
  return `## Drift verdict: ${LABEL[v.classification] ?? v.classification}  ·  confidence ${(v.confidence * 100).toFixed(0)}%\n\n${v.reasoning}`;
}

function directiveFor(classification: string, repoRel: string): string {
  if (classification === "accidental_regression")
    return `This is design-system drift. Apply the proposed fix to \`${repoRel}\`, then tell the user in one line what drifted and what you changed.`;
  if (classification === "platform_constraint")
    return `This looks platform-imposed. Summarize the verdict; only change code if the user asks.`;
  return `This reads as an intentional, system-consistent change. Summarize the verdict for the user; no fix needed.`;
}

const server = new McpServer({ name: "drift", version: "0.1.0" });

server.registerTool(
  "drift_review",
  {
    title: "Drift — design-system review",
    description:
      "Review a UI change for design-system drift. Renders the affected component BEFORE (last commit) and AFTER " +
      "(current working tree); a vision model judges whether the change is an intentional redesign, an accidental " +
      "regression, or a platform constraint — explaining its reasoning in the design system's own language and proposing " +
      "a fix. It also opens a visual before/after review (drift-report.html) in the browser. Pass `interaction` (hover/click) " +
      "to review the component IN MOTION (captures before/after frame sequences and judges duration/easing/distance against " +
      "the motion tokens). Call this right after editing a component's styles.",
    inputSchema: {
      file: z
        .string()
        .describe("Path to the changed component/style file (absolute, or relative to the project root)."),
      selector: z
        .string()
        .optional()
        .describe("CSS selector of the element to target. Defaults to DRIFT_SELECTOR env or '#demo-button'."),
      interaction: z
        .enum(["hover", "click"])
        .optional()
        .describe("If set, review the interaction IN MOTION (before/after frame sequences) instead of a single static frame."),
    },
  },
  async ({ file, selector, interaction }) => {
    try {
      const root = process.env.DRIFT_PROJECT_ROOT || process.cwd();
      const absPath = path.isAbsolute(file) ? file : path.resolve(root, file);
      if (!existsSync(absPath)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Drift: file not found at ${absPath}. Pass an absolute path, or set DRIFT_PROJECT_ROOT to your project root.`,
            },
          ],
        };
      }

      const repoRoot = await getRepoRoot(absPath);
      const repoRel = toRepoRel(repoRoot, absPath);

      const diff = await getDiff(repoRoot, repoRel);
      if (!diff) {
        return {
          content: [{ type: "text", text: `✓ No change vs the last commit for \`${repoRel}\` — nothing to review.` }],
        };
      }

      const beforeContent = await getHeadContent(repoRoot, repoRel);
      const afterContent = await getWorkingContent(absPath);
      const appDir = path.dirname(absPath);
      const previewRel = process.env.DRIFT_PREVIEW || "preview.html";
      const outDir = path.resolve(repoRoot, ".drift-cache");
      const tokensJson = await readFile(path.resolve(appDir, "tokens.json"), "utf8").catch(
        () => "(no tokens.json found next to the component)",
      );
      const modelLabel = process.env.DRIFT_VLM_MODEL || "claude-sonnet-5";

      let verdict: DriftVerdict;
      let visualBefore: Visual;
      let visualAfter: Visual;
      const inline: Content[] = [];

      if (interaction) {
        // --- MOTION path ---
        const frameSelector = process.env.DRIFT_FRAME_SELECTOR || "#stage";
        const targetSelector = selector || process.env.DRIFT_SELECTOR || "#demo-button";
        const base = {
          appDir,
          previewRel,
          changedRelToApp: path.basename(absPath),
          frameSelector,
          targetSelector,
          interaction,
          outDir: path.join(outDir, "motion"),
        };
        const browser = await chromium.launch();
        let before, after;
        try {
          before = await captureInteractionFrames(browser, { ...base, content: beforeContent, label: "before" });
          after = await captureInteractionFrames(browser, { ...base, content: afterContent, label: "after" });
        } finally {
          await browser.close();
        }
        verdict = await getMotionVerdict({
          beforeFramePaths: before.framePaths,
          afterFramePaths: after.framePaths,
          tokensJson,
          diff,
          filePath: repoRel,
          interaction,
        });
        visualBefore = { kind: "frames", dataUris: before.frameBase64.map(dataUri) };
        visualAfter = { kind: "frames", dataUris: after.frameBase64.map(dataUri) };
        inline.push(
          { type: "text", text: headline(verdict) },
          { type: "text", text: `**Before** — \`${interaction}\` from rest → settled:` },
          { type: "image", data: before.frameBase64[0], mimeType: "image/png" },
          { type: "image", data: before.frameBase64[before.frameBase64.length - 1], mimeType: "image/png" },
          { type: "text", text: `**After** — \`${interaction}\` from rest → settled:` },
          { type: "image", data: after.frameBase64[0], mimeType: "image/png" },
          { type: "image", data: after.frameBase64[after.frameBase64.length - 1], mimeType: "image/png" },
        );
      } else {
        // --- STATIC path ---
        const sel = selector || process.env.DRIFT_SELECTOR || "#demo-button";
        const r = await renderBeforeAfter({
          appDir,
          previewRel,
          changedRelToApp: path.basename(absPath),
          beforeContent,
          afterContent,
          selector: sel,
          outDir,
        });
        verdict = await getVerdict({
          beforePngPath: r.beforePngPath,
          afterPngPath: r.afterPngPath,
          tokensJson,
          diff,
          filePath: repoRel,
        });
        visualBefore = { kind: "image", dataUri: dataUri(r.beforePngBase64) };
        visualAfter = { kind: "image", dataUri: dataUri(r.afterPngBase64) };
        inline.push(
          { type: "text", text: headline(verdict) },
          { type: "text", text: "**Before** — last committed render:" },
          { type: "image", data: r.beforePngBase64, mimeType: "image/png" },
          { type: "text", text: "**After** — current render:" },
          { type: "image", data: r.afterPngBase64, mimeType: "image/png" },
        );
      }

      // --- Visual review report ---
      const html = buildReportHtml({
        verdict,
        filePath: repoRel,
        model: modelLabel,
        interaction,
        before: visualBefore,
        after: visualAfter,
      });
      const reportPath = path.join(outDir, "drift-report.html");
      await writeAndOpenReport(html, reportPath, process.env.DRIFT_OPEN !== "0");

      const content: Content[] = [...inline];
      if (verdict.proposed_diff.trim()) {
        content.push({ type: "text", text: `**Proposed fix**\n\`\`\`diff\n${verdict.proposed_diff}\n\`\`\`` });
      }
      content.push({ type: "text", text: `🔍 Opened a visual before/after review → ${reportPath}` });
      content.push({ type: "text", text: directiveFor(verdict.classification, repoRel) });
      return { content };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Drift failed: ${err instanceof Error ? err.message : String(err)}` }],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("drift MCP server ready (stdio)");
