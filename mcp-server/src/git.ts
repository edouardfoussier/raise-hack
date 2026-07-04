import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";

const exec = promisify(execFile);
const MAX = 20 * 1024 * 1024;

/** Absolute path of the git repo that contains `fromPath`. */
export async function getRepoRoot(fromPath: string): Promise<string> {
  const cwd = path.dirname(path.resolve(fromPath));
  const { stdout } = await exec("git", ["rev-parse", "--show-toplevel"], { cwd });
  return stdout.trim();
}

/** Content of a file at git HEAD (the "before" state). */
export async function getHeadContent(repoRoot: string, repoRelPath: string): Promise<string> {
  const { stdout } = await exec("git", ["show", `HEAD:${repoRelPath}`], { cwd: repoRoot, maxBuffer: MAX });
  return stdout;
}

/** Current working-tree content (the "after" state). */
export async function getWorkingContent(absPath: string): Promise<string> {
  return readFile(absPath, "utf8");
}

/** Unified diff of a file vs HEAD (context for the VLM). */
export async function getDiff(repoRoot: string, repoRelPath: string): Promise<string> {
  const { stdout } = await exec("git", ["diff", "HEAD", "--", repoRelPath], { cwd: repoRoot, maxBuffer: MAX });
  return stdout.trim();
}

/** Repo-root-relative, forward-slashed path (git wants forward slashes). */
export function toRepoRel(repoRoot: string, absPath: string): string {
  return path.relative(repoRoot, absPath).split(path.sep).join("/");
}
