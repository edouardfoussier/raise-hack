"use client";

import { Copy, ExternalLink, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
