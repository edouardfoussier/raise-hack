import Link from "next/link";
import { AudioLines, Captions, Eye } from "lucide-react";

import { VideoPoster } from "@/components/video-poster";
import { Badge } from "@/components/ui/badge";
import type { Video } from "@/lib/types";
import { formatCompactNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function VideoCard({
  video,
  projectName,
}: {
  video: Video;
  projectName?: string;
}) {
  const ready = video.status === "ready";

  const inner = (
    <>
      <div className="group/poster relative">
        <VideoPoster
          color={video.thumbnailColor}
          durationSec={video.durationSec}
          processing={!ready}
          className="aspect-video w-full rounded-xl"
        />
        {!ready ? (
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 gap-1.5"
          >
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
            Processing
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        <div className="space-y-0.5">
          <h3 className="line-clamp-1 font-medium">{video.title}</h3>
          {projectName ? (
            <p className="text-xs text-muted-foreground">{projectName}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3.5" />
            <span className="tabular-nums">
              {video.analytics.views > 0
                ? formatCompactNumber(video.analytics.views)
                : "New"}
            </span>
          </span>
          {video.hasCaptions ? (
            <span title="Captions">
              <Captions className="size-3.5" />
            </span>
          ) : null}
          {video.hasVoiceover ? (
            <span title="Voice-over">
              <AudioLines className="size-3.5" />
            </span>
          ) : null}
          <span className="ml-auto">
            {formatRelativeTime(video.createdAt)}
          </span>
        </div>
      </div>
    </>
  );

  const cardClass = cn(
    "block rounded-2xl border border-border bg-card p-3 transition-colors",
    ready ? "hover:border-primary/40" : "opacity-90",
  );

  if (!ready) {
    return <div className={cardClass}>{inner}</div>;
  }

  return (
    <Link href={`/v/${video.shareId}`} className={cardClass}>
      {inner}
    </Link>
  );
}
