"use client";

import { useRef, useState } from "react";
import { RotateCcw, UploadCloud, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_MB = 4;

/**
 * Avatar asset card. Upload is a STUB: the selected image is previewed
 * client-side (never uploaded) so the flow feels real without a storage layer.
 */
export function AvatarUploadCard({
  initialAvatarUrl,
  name,
}: {
  initialAvatarUrl: string;
  name: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = preview ?? initialAvatarUrl;

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Unsupported file", {
        description: "Choose a PNG, JPG, GIF or WebP image.",
      });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error("Image too large", {
        description: `Keep it under ${MAX_MB}MB.`,
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(typeof reader.result === "string" ? reader.result : null);
      toast.success("Avatar ready", {
        description: "Preview only — connect storage to save uploads.",
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <UserRound className="size-4" />
        </span>
        <div>
          <h2 className="font-heading text-base font-medium">Avatar</h2>
          <p className="text-xs text-muted-foreground">
            Shown on share pages and voice-overs.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={`${name} avatar`}
            className="size-24 rounded-2xl object-cover ring-1 ring-border"
          />
          {preview ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setPreview(null)}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Current</span>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/40 px-4 py-6 text-center transition-colors",
            dragActive && "border-primary/60 bg-primary/5",
          )}
        >
          <span className="grid size-9 place-items-center rounded-lg bg-secondary text-muted-foreground">
            <UploadCloud className="size-4" />
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Drop an image or browse</p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, GIF · up to {MAX_MB}MB
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Choose file
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Upload avatar image"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </div>
    </div>
  );
}
