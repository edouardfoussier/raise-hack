/**
 * Unified project registry for the Vercel-style project switcher.
 *
 * The app has two historical project namespaces — `mock-data.ts` (video demos)
 * and `design-systems.ts` (extracted design systems). The switcher and the
 * Diff Render section reason over ONE canonical list, defined here, so the
 * top-navbar dropdown, the scoping cookie, and the guardrails timeline all
 * agree on which projects exist.
 *
 * "Current project" is persisted in a plain cookie so scoping survives across
 * server-rendered navigations without a database or client store.
 */

import { getDsProjects } from "./design-systems";

/** Cookie that carries the currently-selected project id. */
export const PROJECT_COOKIE = "diffender.project";

export interface SwitcherProject {
  id: string;
  name: string;
  url: string;
  /** Brand color for the switcher swatch. */
  color: string;
}

/**
 * The switcher's canonical projects, in display order:
 * The Sphinx · Wattane · Archipel · Déjà Bu. Sourced from the design-system
 * seed so names, urls and colors stay in one place.
 */
export function getSwitcherProjects(): SwitcherProject[] {
  return getDsProjects().map((p) => ({
    id: p.id,
    name: p.name,
    url: p.url,
    color: p.thumbnailColor,
  }));
}

/** The default project when the cookie is unset — the demo centerpiece. */
export const DEFAULT_PROJECT_ID = "prj_thesphinx";

/** Resolve a project id to its switcher entry, falling back to the default. */
export function getSwitcherProject(id: string | undefined): SwitcherProject {
  const projects = getSwitcherProjects();
  return (
    projects.find((p) => p.id === id) ??
    projects.find((p) => p.id === DEFAULT_PROJECT_ID) ??
    projects[0]
  );
}

/**
 * Read the current project id from the incoming request cookies (server-side).
 * Next 16 `cookies()` is async; callers must await it.
 */
export async function getCurrentProjectId(): Promise<string> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const id = store.get(PROJECT_COOKIE)?.value;
  const projects = getSwitcherProjects();
  if (id && projects.some((p) => p.id === id)) return id;
  return DEFAULT_PROJECT_ID;
}
