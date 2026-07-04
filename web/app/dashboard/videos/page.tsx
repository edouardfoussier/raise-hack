import type { Metadata } from "next";

import { GenerateDemoForm } from "@/components/videos/generate-demo-form";
import {
  VideoGallery,
  type VideoGalleryItem,
} from "@/components/videos/video-gallery";
import { getProjectById, getVideos } from "@/lib/mock-data";

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
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Videos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every demo you have generated — share links, captions, voice-over and
          per-clip analytics.
        </p>
      </div>

      <GenerateDemoForm />

      <VideoGallery items={items} />
    </div>
  );
}
