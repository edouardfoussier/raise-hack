import { Film } from "lucide-react";

import { GithubIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

export function ProjectCard({
  project,
  videoCount,
}: {
  project: Project;
  videoCount: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40">
      <div
        className="h-20"
        style={{
          backgroundImage: `radial-gradient(120% 140% at 12% 0%, color-mix(in oklch, ${project.thumbnailColor} 65%, transparent), transparent 60%), linear-gradient(160deg, #161b20, #0b0d10)`,
        }}
      />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-heading text-base font-medium">
              {project.name}
            </h3>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <GithubIcon className="size-3.5" />
              <span className="truncate">{project.repo}</span>
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {project.framework}
          </Badge>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {project.description}
        </p>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Film className="size-3.5" />
            {videoCount} {videoCount === 1 ? "video" : "videos"}
          </span>
          <span>Deployed {formatRelativeTime(project.lastDeployedAt)}</span>
        </div>
      </div>
    </div>
  );
}
