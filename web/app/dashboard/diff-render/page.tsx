import type { Metadata } from "next";
import { ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";

import { CommitTimeline } from "@/components/reviews/commit-timeline";
import { Badge } from "@/components/ui/badge";
import {
  getCommitsForProject,
  regressionCountForProject,
} from "@/lib/reviews";
import { getCurrentProjectId, getSwitcherProject } from "@/lib/projects";

export const metadata: Metadata = { title: "Diff Render" };

/**
 * Diff Render — the Design Guardrails per-commit surface.
 *
 * At every commit, the Drift review agent diffs the rendered UI against the
 * project's design system and files a verdict: accidental regression,
 * intentional redesign, or platform constraint. This page renders those cached
 * verdicts as a commit timeline, scoped to the project chosen in the top-navbar
 * switcher (persisted in a cookie).
 */
export default async function DiffRenderPage() {
  const projectId = await getCurrentProjectId();
  const project = getSwitcherProject(projectId);

  const commits = getCommitsForProject(projectId);
  const regressions = regressionCountForProject(projectId);
  const watched = commits.filter((c) => c.review).length;
  const cleared = watched - regressions;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <ShieldCheck className="size-4" />
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Diff Render
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          At every commit to{" "}
          <span className="font-medium text-foreground">{project.name}</span>,
          Design Guardrails renders the diff and reasons about it against the
          design system — flagging regressions, clearing intentional redesigns,
          and allowing platform constraints.
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-4" />
            <span className="text-2xl font-semibold tabular-nums">
              {regressions}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Regression{regressions === 1 ? "" : "s"} flagged
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="size-4" />
            <span className="text-2xl font-semibold tabular-nums">
              {cleared}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Change{cleared === 1 ? "" : "s"} cleared as on-system
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="size-4" />
            <span className="text-2xl font-semibold tabular-nums">
              {watched}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Commit{watched === 1 ? "" : "s"} reviewed
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-medium">Commit history</h2>
          {regressions > 0 ? (
            <Badge
              variant="outline"
              className="gap-1.5 border-destructive/40 text-destructive"
            >
              <ShieldAlert className="size-3.5" />
              {regressions} to review
            </Badge>
          ) : null}
        </div>

        {commits.length > 0 ? (
          <CommitTimeline commits={commits} />
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <ShieldCheck className="size-5" />
            </span>
            <p className="mt-4 font-heading text-base font-medium">
              No commits watched yet
            </p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Connect {project.name} to start rendering every commit against its
              design system.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
