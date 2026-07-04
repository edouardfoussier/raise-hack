"use client";

import { useMemo, useState } from "react";
import { Film } from "lucide-react";

import { VideoCard } from "@/components/videos/video-card";
import type { Video, VideoStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type VideoGalleryItem = { video: Video; projectName?: string };

type Filter = "all" | VideoStatus;

const CHIPS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ready", label: "Ready" },
  { key: "processing", label: "Processing" },
];

export function VideoGallery({ items }: { items: VideoGalleryItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: items.length,
      ready: items.filter((i) => i.video.status === "ready").length,
      processing: items.filter((i) => i.video.status === "processing").length,
    }),
    [items],
  );

  const filtered = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter((i) => i.video.status === filter),
    [items, filter],
  );

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Filter videos" className="flex flex-wrap items-center gap-2">
        {CHIPS.map((chip) => {
          const active = filter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(chip.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] leading-4 tabular-nums",
                  active
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {counts[chip.key]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <VideoCard
              key={item.video.id}
              video={item.video}
              projectName={item.projectName}
            />
          ))}
        </div>
      ) : (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Film className="size-5" />
          </span>
          <p className="mt-4 font-heading text-base font-medium">
            No {filter} videos
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Nothing matches this filter yet. Generate a demo to see it here.
          </p>
        </div>
      )}
    </div>
  );
}
