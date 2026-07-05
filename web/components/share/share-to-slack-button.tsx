"use client";

import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SlackIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type ShareToSlackButtonProps = {
  /** Public path or URL to the mp4, e.g. "/videos/submission.mp4". */
  videoPath: string;
  /** Human title used for the Slack file + comment. */
  title: string;
  /** Button label (defaults to "Share to Slack"). */
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
};

/**
 * Uploads a generated demo mp4 to the team's Slack channel via
 * POST /api/share-slack, with a sonner toast on success/error.
 * Flame + theme-aware; carries the Slack glyph.
 */
export function ShareToSlackButton({
  videoPath,
  title,
  label = "Share to Slack",
  variant = "outline",
  size = "sm",
  className,
}: ShareToSlackButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function handleShare() {
    if (state === "loading") return;
    setState("loading");
    const toastId = toast.loading("Sharing to Slack…", {
      description: title,
    });
    try {
      const res = await fetch("/api/share-slack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoPath, title }),
      });
      const data = (await res.json()) as { ok?: boolean; permalink?: string; error?: string };
      if (!res.ok || data.error || !data.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setState("done");
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
      // Revert the confirmation glyph after a beat.
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setState("idle");
      toast.error("Couldn't share to Slack", {
        id: toastId,
        description: (e as Error).message.slice(0, 200),
      });
    }
  }

  const loading = state === "loading";
  const done = state === "done";

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={loading}
      className={cn("gap-1.5", className)}
    >
      {loading ? (
        <LoaderCircle className="size-3.5 animate-spin" />
      ) : done ? (
        <Check className="size-3.5 text-primary" />
      ) : (
        <SlackIcon className="size-3.5 text-primary" />
      )}
      {loading ? "Sharing…" : done ? "Shared" : label}
    </Button>
  );
}
