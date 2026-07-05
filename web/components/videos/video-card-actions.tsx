"use client";

import { Copy, ExternalLink, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { SlackIcon } from "@/components/icons";
import type { Video } from "@/lib/types";
import { cn } from "@/lib/utils";

export function VideoCardActions({ video }: { video: Video }) {
  const shareHref = `/v/${video.shareId}`;

  async function handleCopy() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${shareHref}`
        : shareHref;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied", { description: url });
    } catch {
      toast.error("Couldn't copy link", {
        description: "Copy it manually from the share page.",
      });
    }
  }

  async function handleShareToSlack() {
    if (!video.videoUrl) {
      toast.error("Nothing to share yet", {
        description: "This demo has no video file.",
      });
      return;
    }
    const toastId = toast.loading("Sharing to Slack…", {
      description: video.title,
    });
    try {
      const res = await fetch("/api/share-slack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoPath: video.videoUrl, title: video.title }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        permalink?: string;
        error?: string;
      };
      if (!res.ok || data.error || !data.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      toast.success("Shared to Slack", {
        id: toastId,
        description: "Posted to #product-review.",
        action: data.permalink
          ? {
              label: "Open",
              onClick: () => window.open(data.permalink, "_blank", "noopener"),
            }
          : undefined,
      });
    } catch (e) {
      toast.error("Couldn't share to Slack", {
        id: toastId,
        description: (e as Error).message.slice(0, 200),
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Video actions"
        className={cn(
          buttonVariants({ variant: "secondary", size: "icon-sm" }),
          "border border-white/10 bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 hover:text-white",
        )}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-52">
        <DropdownMenuItem
          render={
            <a href={shareHref} target="_blank" rel="noreferrer noopener" />
          }
        >
          <ExternalLink className="text-muted-foreground" />
          Open share page
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="text-muted-foreground" />
          Copy share link
        </DropdownMenuItem>
        {video.videoUrl ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleShareToSlack}>
              <SlackIcon className="text-primary" />
              Share to Slack
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
