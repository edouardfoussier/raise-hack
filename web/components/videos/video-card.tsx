import Link from "next/link";
import Image from "next/image";
import { AudioLines, Captions, Clock, Eye, Fingerprint } from "lucide-react";

import { VideoPoster } from "@/components/video-poster";
import { Badge } from "@/components/ui/badge";
import { VideoCardActions } from "@/components/videos/video-card-actions";
import type { Video } from "@/lib/types";
import {
  formatCompactNumber,
  formatDuration,
  formatRelativeTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";

function StatusBadge({ ready }: { ready: boolean }) {
  return (
    <Badge variant={ready ? "outline" : "secondary"} className="gap-1.5">
      <span
        className={cn(
          "inline-block size-1.5 rounded-full bg-primary",
          !ready && "animate-pulse",
        )}
      />
      {ready ? "Ready" : "Processing"}
    </Badge>
  );
}

function Poster({ video, ready }: { video: Video; ready: boolean }) {
  if (video.thumbnailUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#0b0d10]">
        <Image
          src={video.thumbnailUrl}
          alt=""
          fill
          unoptimized
          sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 100vw"
          className="object-cover"
        />
        {typeof video.durationSec === "number" ? (
          <span className="absolute right-2 bottom-2 rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[11px] text-white/90 backdrop-blur-sm">
            {formatDuration(video.durationSec)}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <VideoPoster
      color={video.thumbnailColor}
      durationSec={video.durationSec}
      processing={!ready}
      className="aspect-video w-full rounded-xl"
    />
  );
}

export function VideoCard({
  video,
  projectName,
}: {
  video: Video;
  projectName?: string;
}) {
  const ready = video.status === "ready";
  const shareHref = `/v/${video.shareId}`;
  const lastViewed = video.analytics.lastViewedAt;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40">
      <div className="relative">
        {ready ? (
          <Link
            href={shareHref}
            target="_blank"
            rel="noreferrer noopener"
            className="group/poster block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Poster video={video} ready={ready} />
          </Link>
        ) : (
          <div className="group/poster">
            <Poster video={video} ready={ready} />
          </div>
        )}

        {!ready ? (
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 gap-1.5 backdrop-blur-sm"
          >
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
            Processing
          </Badge>
        ) : (
          <div className="absolute top-2 right-2">
            <VideoCardActions video={video} />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-1 font-medium" title={video.title}>
              {ready ? (
                <Link
                  href={shareHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="outline-none transition-colors hover:text-primary focus-visible:text-primary"
                >
                  {video.title}
                </Link>
              ) : (
                video.title
              )}
            </h3>
            {projectName ? (
              <p className="truncate text-xs text-muted-foreground">
                {projectName}
              </p>
            ) : null}
          </div>
          <StatusBadge ready={ready} />
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="size-3.5" />
            {formatDuration(video.durationSec)}
          </span>
          {video.hasCaptions ? (
            <span className="inline-flex items-center gap-1" title="Captions">
              <Captions className="size-3.5" />
            </span>
          ) : null}
          {video.hasVoiceover ? (
            <span className="inline-flex items-center gap-1" title="Voice-over">
              <AudioLines className="size-3.5" />
            </span>
          ) : null}
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-background/30 p-2.5 text-center">
          <div className="min-w-0">
            <dt className="inline-flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Eye className="size-3" />
              Views
            </dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">
              {video.analytics.views > 0
                ? formatCompactNumber(video.analytics.views)
                : "New"}
            </dd>
          </div>
          <div className="min-w-0 border-x border-border/60">
            <dt className="inline-flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Fingerprint className="size-3" />
              Unique
            </dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">
              {video.analytics.uniqueIps > 0
                ? formatCompactNumber(video.analytics.uniqueIps)
                : "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] text-muted-foreground">Last viewed</dt>
            <dd className="mt-0.5 truncate text-sm font-medium">
              {lastViewed ? formatRelativeTime(lastViewed) : "Never"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
