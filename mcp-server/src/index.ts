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
import { reviewFlow, type FlowDef } from "./flow-review.js";
import { extractDesignSystem } from "./extract.js";
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

server.registerTool(
  "drift_flow",
  {
    title: "Drift — user-flow review",
    description:
      "Replay a whole USER FLOW through the app BEFORE (last commit) and AFTER (current edit) with a simulated moving " +
      "cursor, judge the design-system drift across the entire journey, and open a side-by-side visual report where both " +
      "flows play on loop. Reads a flow definition (drift.flow.json: appDir, preview, steps). Use to review what a change " +
      "does across a full journey — not just one component.",
    inputSchema: {
      file: z.string().describe("The changed component/style file (absolute, or relative to the project root)."),
      flow: z
        .string()
        .optional()
        .describe("Path to the flow definition JSON. Defaults to DRIFT_FLOW env or drift.flow.json at the project root."),
    },
  },
  async ({ file, flow }) => {
    try {
      const root = process.env.DRIFT_PROJECT_ROOT || process.cwd();
      const absPath = path.isAbsolute(file) ? file : path.resolve(root, file);
      if (!existsSync(absPath)) {
        return { isError: true, content: [{ type: "text", text: `Drift: file not found at ${absPath}.` }] };
      }
      const flowPath = flow
        ? path.isAbsolute(flow)
          ? flow
          : path.resolve(root, flow)
        : process.env.DRIFT_FLOW || path.join(root, "drift.flow.json");
      if (!existsSync(flowPath)) {
        return {
          isError: true,
          content: [
            { type: "text", text: `Drift: no flow definition at ${flowPath}. Create drift.flow.json with { appDir, preview, steps }.` },
          ],
        };
      }
      const flowDef = JSON.parse(await readFile(flowPath, "utf8")) as FlowDef;

      const review = await reviewFlow(absPath, flowDef);
      if (!review) {
        return { content: [{ type: "text", text: `✓ No change vs the last commit for \`${file}\` — nothing to review.` }] };
      }

      const modelLabel = process.env.DRIFT_VLM_MODEL || "claude-sonnet-5";
      const toVideo = async (p: string): Promise<Visual> => ({
        kind: "video",
        dataUri: `data:video/webm;base64,${(await readFile(p)).toString("base64")}`,
      });
      const html = buildReportHtml({
        verdict: review.verdict,
        filePath: review.fileRel,
        model: modelLabel,
        interaction: "flow",
        before: await toVideo(review.beforeWebm),
        after: await toVideo(review.afterWebm),
      });
      const reportPath = path.join(review.outDir, "flow-report.html");
      await writeAndOpenReport(html, reportPath, process.env.DRIFT_OPEN !== "0");

      const content: Content[] = [
        { type: "text", text: headline(review.verdict) },
        { type: "text", text: `🎬 Opened a side-by-side **user-flow** review (before/after play on loop) → ${reportPath}` },
      ];
      if (review.verdict.proposed_diff.trim()) {
        content.push({ type: "text", text: `**Proposed fix**\n\`\`\`diff\n${review.verdict.proposed_diff}\n\`\`\`` });
      }
      content.push({ type: "text", text: directiveFor(review.verdict.classification, review.fileRel) });
      return { content };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Drift flow failed: ${err instanceof Error ? err.message : String(err)}` }],
      };
    }
  },
);

server.registerTool(
  "extract_design_system",
  {
    title: "Scenario — extract a live design system",
    description:
      "Connect a running app to Scenario by extracting its LIVE design system from a URL. Drives a headless browser " +
      "over the page (via dembrandt) and returns the design system a coding agent would show: brand colors (hex + role), " +
      "the typography scale (font families + sizes), the spacing scale, motion tokens, breakpoints, and a component count. " +
      "These are the same tokens Drift then reviews your edits against. Use to onboard an app (\"connect your app from your " +
      "coding agent\") before reviewing changes with drift_review / drift_flow.",
    inputSchema: {
      url: z.string().describe("URL of the running app to extract (a full URL, or a bare domain like 'thesphinx.ai')."),
      dark: z.boolean().optional().describe("Extract colors from the site's dark mode."),
      slow: z.boolean().optional().describe("Use 3x longer timeouts for slow-loading sites."),
    },
  },
  async ({ url, dark, slow }) => {
    // dembrandt writes output/<domain>/*.json relative to cwd; run it from the
    // mcp-server dir (where this file lives) so output lands beside the server.
    const cwd = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
    const result = await extractDesignSystem(url, { cwd, dark, slow });
    if (!result.ok) {
      return { isError: true, content: [{ type: "text", text: `Scenario extract: ${result.error}` }] };
    }
    const content: Content[] = [
      { type: "text", text: result.summary! },
      {
        type: "text",
        text:
          "Report this design-system summary to the user, framed as \"this is your app's live design system in " +
          "Scenario — edit a component, then /drift to review your change against these tokens.\"",
      },
    ];
    return { content };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("drift MCP server ready (stdio)");
