"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Boxes,
  Clock,
  Globe,
  Loader2,
  Palette,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import type { DsProject } from "@/lib/design-systems";
import { tokenCount } from "@/lib/design-systems";
import { useDsStore } from "@/lib/ds-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function prettyUrl(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return `${host}${pathname === "/" ? "" : pathname}`;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}

function ProjectTile({ project }: { project: DsProject }) {
  const extracted = project.status === "extracted" && project.ds;
  const href = `/dashboard/projects/${project.id}/design-system`;
  const count = extracted ? tokenCount(project.ds!) : 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40">
      <div
        className="relative h-20"
        style={{
          backgroundImage: `radial-gradient(120% 140% at 12% 0%, color-mix(in oklch, ${project.thumbnailColor} 72%, transparent), transparent 60%), linear-gradient(160deg, color-mix(in oklch, ${project.thumbnailColor} 22%, #0b0d10), #0b0d10)`,
        }}
      >
        <div className="bg-grid absolute inset-0 opacity-30" />
        {extracted ? (
          <Badge
            variant="secondary"
            className="absolute top-3 right-3 gap-1.5 backdrop-blur-sm"
          >
            <span className="size-1.5 rounded-full bg-primary" />
            Extracted
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="absolute top-3 right-3 gap-1.5 bg-background/70 backdrop-blur-sm"
          >
            <Clock className="size-3" />
            Pending
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-heading text-base font-medium transition-colors group-hover:text-primary">
            {project.name}
          </h3>
        </div>
        <a
          href={project.url}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1 inline-flex w-fit max-w-full items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          <Globe className="size-3.5 shrink-0" />
          <span className="truncate">{prettyUrl(project.url)}</span>
          <ArrowUpRight className="size-3.5 shrink-0 opacity-70" />
        </a>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {project.description}
        </p>

        <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-4">
          {extracted ? (
            <>
              <Link
                href={href}
                className={cn(
                  "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                )}
              >
                <Palette className="size-4" />
                View design system
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs text-muted-foreground">
                <Boxes className="size-3.5" />
                {count}
              </span>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {project.note ?? "Extraction pending."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AddProjectCard() {
  const { addProject } = useDsStore();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function extract(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !url.trim()) return;
    setLoading(true);
    const t = toast.loading("Extracting design system…", {
      description: "Running dembrandt against the live site. This can take a minute.",
    });
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Extraction failed.", { id: t });
      } else {
        addProject(data.project);
        toast.success(`Extracted ${data.project.name}`, {
          id: t,
          description: "Added to your projects below.",
        });
        setUrl("");
      }
    } catch {
      toast.error("Couldn't reach the extractor.", { id: t });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={extract}
      className="flex flex-col justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-5"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Plus className="size-4" />
        </span>
        <div>
          <p className="font-heading text-sm font-medium">Add a project</p>
          <p className="text-xs text-muted-foreground">
            Paste a live URL — we extract its design system.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourapp.com"
          inputMode="url"
          className="h-10"
          disabled={loading}
        />
        <Button type="submit" className="h-10 gap-1.5" disabled={loading || !url.trim()}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Extracting
            </>
          ) : (
            "Extract"
          )}
        </Button>
      </div>
    </form>
  );
}

export function DsProjects({ seedProjects }: { seedProjects: DsProject[] }) {
  const { hydrated, addedProjects } = useDsStore();

  // Runtime-added projects first, then the seeds. De-dupe by id.
  const seen = new Set<string>();
  const all: DsProject[] = [];
  for (const p of [...(hydrated ? addedProjects : []), ...seedProjects]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    all.push(p);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {all.map((p) => (
          <ProjectTile key={p.id} project={p} />
        ))}
        <AddProjectCard />
      </div>
    </div>
  );
}
