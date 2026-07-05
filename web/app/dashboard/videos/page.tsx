import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Wand2 } from "lucide-react";

import {
  VideoGallery,
  type VideoGalleryItem,
} from "@/components/videos/video-gallery";
import { buttonVariants } from "@/components/ui/button";
import { getProjectById, getVideos } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Videos" };

export default function VideosPage() {
  const items: VideoGalleryItem[] = getVideos()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((video) => ({
      video,
      projectName: getProjectById(video.projectId)?.name,
    }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Videos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every demo you have generated — share links, captions, voice-over and
            per-clip analytics.
          </p>
        </div>
        <Link
          href="/dashboard/generate"
          className={cn(buttonVariants({ size: "lg" }), "gap-2")}
        >
          <Wand2 className="size-4" />
          Generate demo
        </Link>
      </div>

      {/* CTA into the multi-step wizard */}
      <Link
        href="/dashboard/generate"
        className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-base font-semibold tracking-tight">
            Generate a new demo
          </p>
          <p className="text-sm text-muted-foreground">
            Source → voice-over → avatar → script → film. A guided, deterministic
            walkthrough in your own voice.
          </p>
        </div>
        <span className="hidden text-sm font-medium text-primary group-hover:underline sm:inline">
          Start →
        </span>
      </Link>

      <VideoGallery items={items} />
    </div>
  );
}
