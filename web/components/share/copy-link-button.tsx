"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Copies the current share URL to the clipboard. Uses the live
 * `window.location` so it works for any `/v/[id]` without extra config.
 */
export function CopyLinkButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url =
      typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Share link copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — copy the URL from the address bar");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={copy}
      className={cn("h-9 gap-2", className)}
    >
      {copied ? (
        <Check className="size-4 text-primary" />
      ) : (
        <Link2 className="size-4" />
      )}
      <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
    </Button>
  );
}
