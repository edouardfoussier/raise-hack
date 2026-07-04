"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Mic, Pause, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Assets } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Deterministic bar heights (%) so SSR and client markup match exactly. */
const WAVEFORM = [
  28, 44, 66, 52, 80, 38, 92, 60, 34, 72, 48, 88, 56, 40, 76, 62, 30, 84, 50,
  68, 42, 90, 58, 36, 74, 46, 82, 54, 64, 32, 78, 60, 46, 86, 52, 70, 40, 94,
  56, 38,
];

export function ClonedVoiceCard({ voice }: { voice: Assets["clonedVoice"] }) {
  const [playing, setPlaying] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const ready = voice?.status === "ready";

  function handlePlay() {
    if (!ready) return;
    if (playing) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    toast.info("Playing sample…", {
      description: voice?.name,
    });
    timeoutRef.current = setTimeout(() => setPlaying(false), 2800);
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <AudioLines className="size-4" />
          </span>
          <div>
            <h2 className="font-heading text-base font-medium">Cloned voice</h2>
            <p className="text-xs text-muted-foreground">
              Narrates your demos in your own voice.
            </p>
          </div>
        </div>
        {voice ? (
          ready ? (
            <Badge className="gap-1.5">
              <span className="inline-block size-1.5 rounded-full bg-primary-foreground" />
              Ready
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5">
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
              Training
            </Badge>
          )
        ) : null}
      </div>

      {voice ? (
        <div className="mt-5 flex flex-1 flex-col">
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="flex items-center gap-3">
              <Button
                size="icon-lg"
                variant={ready ? "default" : "secondary"}
                aria-label={playing ? "Pause sample" : "Play sample"}
                disabled={!ready}
                onClick={handlePlay}
                className="rounded-full"
              >
                {playing ? (
                  <Pause className="size-4 fill-current" />
                ) : (
                  <Play className="size-4 translate-x-px fill-current" />
                )}
              </Button>
              <div
                className="flex h-12 flex-1 items-center gap-[3px]"
                aria-hidden="true"
              >
                {WAVEFORM.map((h, i) => (
                  <span
                    key={i}
                    className={cn(
                      "w-full flex-1 rounded-full transition-[height,background-color] duration-300",
                      playing
                        ? "animate-pulse bg-primary"
                        : ready
                          ? "bg-primary/40"
                          : "bg-muted-foreground/30",
                    )}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm font-medium">{voice.name}</p>
          <p className="text-xs text-muted-foreground">
            {ready
              ? "Trained and ready to use in new demos."
              : "We'll email you when training finishes."}
          </p>

          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                toast("Voice cloning — coming soon", {
                  description: "Record 30s of audio to train a new voice.",
                })
              }
            >
              <Mic className="size-3.5" />
              Clone new voice
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/40 px-4 py-10 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Sparkles className="size-5" />
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">No voice cloned yet</p>
            <p className="text-xs text-muted-foreground">
              Add a voice to narrate every demo automatically.
            </p>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() =>
              toast("Voice cloning — coming soon", {
                description: "Record 30s of audio to train a new voice.",
              })
            }
          >
            <Mic className="size-3.5" />
            Clone a voice
          </Button>
        </div>
      )}
    </div>
  );
}
