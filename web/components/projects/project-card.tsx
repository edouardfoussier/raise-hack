import Link from "next/link";
import { ArrowUpRight, Film, Globe } from "lucide-react";

import { GenerateDemoButton } from "@/components/dashboard/generate-demo-button";
import { GithubIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { Project } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Strip the protocol so `https://app.diffender.com` renders as `app.diffender.com`. */
function prettyUrl(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return `${host}${pathname === "/" ? "" : pathname}`;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}

export function ProjectCard({
  project,
  videoCount,
}: {
  project: Project;
  videoCount: number;
}) {
  const detailHref = `/dashboard/projects/${project.id}`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40">
      {/* Gradient accent derived from the project's brand color. */}
      <div
        className="relative h-24"
        style={{
          backgroundImage: `radial-gradient(120% 140% at 12% 0%, color-mix(in oklch, ${project.thumbnailColor} 68%, transparent), transparent 60%), linear-gradient(160deg, #161b20, #0b0d10)`,
        }}
      >
        <div className="bg-grid absolute inset-0 opacity-30" />
        <Badge
          variant="secondary"
          className="absolute top-3 right-3 backdrop-blur-sm"
        >
          {project.framework}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="min-w-0">
          <Link
            href={detailHref}
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <h3 className="truncate font-heading text-base font-medium transition-colors group-hover:text-primary">
              {project.name}
            </h3>
          </Link>
          <p className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground">
            <GithubIcon className="size-3.5 shrink-0" />
            <span className="truncate">{project.repo}</span>
          </p>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {project.description}
        </p>

        <a
          href={project.appUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-flex w-fit max-w-full items-center gap-1.5 rounded-lg text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Globe className="size-3.5 shrink-0" />
          <span className="truncate">{prettyUrl(project.appUrl)}</span>
          <ArrowUpRight className="size-3.5 shrink-0 opacity-70" />
        </a>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Film className="size-3.5" />
            {videoCount} {videoCount === 1 ? "video" : "videos"}
          </span>
          <span>Deployed {formatRelativeTime(project.lastDeployedAt)}</span>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-4">
          <GenerateDemoButton projectId={project.id} className="h-9 flex-1" />
          <Link
            href={detailHref}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-9 px-3",
            )}
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}
