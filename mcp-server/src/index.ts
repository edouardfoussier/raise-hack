import "./env.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { getRepoRoot, getHeadContent, getWorkingContent, getDiff, toRepoRel } from "./git.js";
import { renderBeforeAfter } from "./render.js";
import { getVerdict } from "./vlm.js";

type Content =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

const LABEL: Record<string, string> = {
  intentional_redesign: "Intentional redesign",
  accidental_regression: "Accidental regression",
  platform_constraint: "Platform constraint",
};

const server = new McpServer({ name: "drift", version: "0.1.0" });

server.registerTool(
  "drift_review",
  {
    title: "Drift — design-system review",
    description:
      "Review a UI change for design-system drift. Renders the affected component BEFORE (last commit) and AFTER " +
      "(current working tree), then a vision model judges whether the change is an intentional redesign, an accidental " +
      "regression, or a platform constraint — explaining its reasoning in the design system's own language and proposing " +
      "a fix. Call this right after editing a component's styles.",
    inputSchema: {
      file: z
        .string()
        .describe("Path to the changed component/style file (absolute, or relative to the project root)."),
      selector: z
        .string()
        .optional()
        .describe("CSS selector of the element to capture. Defaults to DRIFT_SELECTOR env or '#demo-button'."),
    },
  },
  async ({ file, selector }) => {
    try {
      const root = process.env.DRIFT_PROJECT_ROOT || process.cwd();
      const absPath = path.isAbsolute(file) ? file : path.resolve(root, file);

      const repoRoot = await getRepoRoot(absPath);
      const repoRel = toRepoRel(repoRoot, absPath);

      const diff = await getDiff(repoRoot, repoRel);
      if (!diff) {
        return {
          content: [
            { type: "text", text: `✓ No change vs the last commit for \`${repoRel}\` — nothing to review.` },
          ],
        };
      }

      const beforeContent = await getHeadContent(repoRoot, repoRel);
      const afterContent = await getWorkingContent(absPath);

      const appDir = path.dirname(absPath);
      const previewRel = process.env.DRIFT_PREVIEW || "preview.html";
      const sel = selector || process.env.DRIFT_SELECTOR || "#demo-button";
      const outDir = path.resolve(repoRoot, ".drift-cache");

      const r = await renderBeforeAfter({
        appDir,
        previewRel,
        changedRelToApp: path.basename(absPath),
        beforeContent,
        afterContent,
        selector: sel,
        outDir,
      });

      const tokensJson = await readFile(path.resolve(appDir, "tokens.json"), "utf8").catch(
        () => "(no tokens.json found next to the component)",
      );

      const verdict = await getVerdict({
        beforePngPath: r.beforePngPath,
        afterPngPath: r.afterPngPath,
        tokensJson,
        diff,
        filePath: repoRel,
      });

      const directive =
        verdict.classification === "accidental_regression"
          ? `This is design-system drift. Apply the proposed fix to \`${repoRel}\`, then tell the user in one line what drifted and what you changed.`
          : verdict.classification === "platform_constraint"
            ? `This looks platform-imposed. Summarize the verdict; only change code if the user asks.`
            : `This reads as an intentional, system-consistent change. Summarize the verdict for the user; no fix needed.`;

      const content: Content[] = [
        {
          type: "text",
          text: `## Drift verdict: ${LABEL[verdict.classification] ?? verdict.classification}  ·  confidence ${(verdict.confidence * 100).toFixed(0)}%\n\n${verdict.reasoning}`,
        },
        { type: "text", text: "**Before** — last committed render:" },
        { type: "image", data: r.beforePngBase64, mimeType: "image/png" },
        { type: "text", text: "**After** — current render:" },
        { type: "image", data: r.afterPngBase64, mimeType: "image/png" },
      ];
      if (verdict.proposed_diff.trim()) {
        content.push({ type: "text", text: `**Proposed fix**\n\`\`\`diff\n${verdict.proposed_diff}\n\`\`\`` });
      }
      content.push({ type: "text", text: directive });

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
