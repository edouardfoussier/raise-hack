"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/**
 * A single design token swatch. The fill uses the *live* theme utility class
 * (e.g. `bg-primary`) so it is always pixel-accurate, while the printed value
 * mirrors `globals.css` for reference. Click to copy the value.
 */
export function ColorSwatch({
  name,
  value,
  swatchClassName,
}: {
  name: string;
  value: string;
  swatchClassName: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Copied ${name}`);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy value");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex items-center gap-3 rounded-xl border border-border bg-background/40 p-2.5 text-left transition-colors hover:border-primary/40"
    >
      <span
        className={cn(
          "size-10 shrink-0 rounded-lg ring-1 ring-inset ring-white/10",
          swatchClassName,
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          {copied ? (
            <Check className="size-3.5 shrink-0 text-primary" />
          ) : (
            <Copy className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </span>
        <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
          {value}
        </span>
      </span>
    </button>
  );
}
