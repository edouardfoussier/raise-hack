"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Clock,
  Globe,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import type { DsProject } from "@/lib/design-systems";
import { tokenCount } from "@/lib/design-systems";
import { applyRemovals, useDsStore } from "@/lib/ds-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExtractedSystem } from "@/components/design-system/extracted-system";
import { DesignChat } from "@/components/design-system/design-chat";
import { cn } from "@/lib/utils";

function prettyUrl(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return `${host}${pathname === "/" ? "" : pathname}`;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}

/**
 * The interactive design-system detail surface. `seedProject` is the
 * server-known project when the id is a seed; for runtime-extracted projects it
 * is undefined and we resolve from the client store instead.
 */
export function DsDetail({
  projectId,
  seedProject,
}: {
  projectId: string;
  seedProject?: DsProject;
}) {
  const { hydrated, addedProjects, removedFor, removeToken, restoreProject } =
    useDsStore();
  const [chatOpen, setChatOpen] = useState(true);

  const project: DsProject | undefined =
    seedProject ?? addedProjects.find((p) => p.id === projectId);

  const removed = removedFor(projectId);
  const ds = useMemo(
    () => (project?.ds ? applyRemovals(project.ds, removed) : undefined),
    [project?.ds, removed],
  );

  // Not found — only meaningful after hydration (added projects are client-only).
  if (!project) {
    if (!hydrated) {
      return (
        <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
          Loading…
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/design-system"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Design Systems
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            That project isn&apos;t available on this device.
          </p>
        </div>
      </div>
    );
  }

  const removedCount = removed.length;
  const pending = project.status !== "extracted" || !ds;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/design-system"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Design Systems
        </Link>
        {!pending ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChatOpen((v) => !v)}
            className="gap-1.5"
          >
            {chatOpen ? (
              <PanelRightClose className="size-4" />
            ) : (
              <PanelRightOpen className="size-4" />
            )}
            <span className="hidden sm:inline">
              {chatOpen ? "Hide" : "Ask"} design intent
            </span>
          </Button>
        ) : null}
      </div>

      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="glow-accent pointer-events-none absolute inset-x-0 top-0 h-24" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-xl text-white ring-1 ring-white/10"
              style={{
                backgroundImage: `radial-gradient(120% 140% at 12% 0%, color-mix(in oklch, ${project.thumbnailColor} 75%, transparent), transparent 60%), linear-gradient(160deg, #161b20, #0b0d10)`,
              }}
            >
              <span className="font-heading text-lg font-semibold">
                {project.name.slice(0, 1)}
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Design system extracted from your live app
              </p>
              <h1 className="font-heading text-xl font-semibold tracking-tight">
                {project.name}
              </h1>
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
              >
                <Globe className="size-3.5" />
                {prettyUrl(project.url)}
                <ArrowUpRight className="size-3.5 opacity-70" />
              </a>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ds?.frameworks?.[0] ? (
              <Badge variant="outline">{ds.frameworks[0]}</Badge>
            ) : null}
            {pending ? (
              <Badge variant="outline" className="gap-1.5">
                <Clock className="size-3" />
                Extraction pending
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                {tokenCount(ds!)} tokens
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Notes / edit state */}
      {project.note ? (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          {project.note}
        </div>
      ) : null}
      {removedCount > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/[0.05] px-4 py-2.5 text-xs">
          <span className="text-muted-foreground">
            You removed {removedCount} {removedCount === 1 ? "token" : "tokens"}{" "}
            from this system.
          </span>
          <button
            type="button"
            onClick={() => {
              restoreProject(projectId);
              toast.success("Restored removed tokens");
            }}
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <RotateCcw className="size-3.5" />
            Restore all
          </button>
        </div>
      ) : null}

      {pending ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
          <MessageSquare className="mb-3 size-6 text-muted-foreground" />
          <p className="max-w-md text-sm text-muted-foreground">
            {project.note ??
              "This project's design system hasn't been extracted yet."}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-6",
            chatOpen ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1",
          )}
        >
          <div className="min-w-0">
            <ExtractedSystem
              ds={ds!}
              onDelete={(id) => {
                removeToken(projectId, id);
                toast("Removed from system", {
                  description: "Restore anytime from the banner above.",
                });
              }}
            />
          </div>
          {chatOpen ? (
            <aside className="lg:sticky lg:top-20 lg:h-[calc(100dvh-7rem)]">
              <DesignChat ds={ds!} />
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}
