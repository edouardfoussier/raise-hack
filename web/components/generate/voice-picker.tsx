"use client";

import { AudioLines, Check, Sparkles } from "lucide-react";

import type { VoiceAsset } from "@/lib/assets-store";
import { cn } from "@/lib/utils";

/** Deterministic bar heights (%) so SSR and client markup match. */
const WAVE = [30, 60, 45, 80, 52, 70, 38, 64, 48, 74, 42, 58];

/** Selectable cards of voices from the Assets store. */
export function VoicePicker({
  voices,
  value,
  onChange,
}: {
  voices: VoiceAsset[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {voices.map((v) => {
        const selected = v.id === value;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            aria-pressed={selected}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-background/40 hover:border-primary/30",
            )}
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl ring-1",
                selected
                  ? "bg-primary/10 text-primary ring-primary/20"
                  : "bg-muted text-muted-foreground ring-border",
              )}
            >
              <AudioLines className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{v.name}</span>
                {v.seeded && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    <Sparkles className="size-2.5" />
                    Cloned
                  </span>
                )}
              </span>
              <span
                className="mt-1.5 flex h-4 items-center gap-[2px]"
                aria-hidden="true"
              >
                {WAVE.map((h, i) => (
                  <span
                    key={i}
                    className={cn(
                      "w-full flex-1 rounded-full",
                      selected ? "bg-primary/50" : "bg-muted-foreground/30",
                    )}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </span>
            </span>
            <span
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-full border",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/40",
              )}
            >
              {selected && <Check className="size-2.5" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
