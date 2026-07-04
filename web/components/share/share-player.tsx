"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LoaderCircle,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";

type SharePlayerProps = {
  /** Brand color used for the deterministic gradient poster. */
  color: string;
  durationSec: number;
  title: string;
  processing?: boolean;
  /** Rotating faux caption lines shown while "playing". */
  captions?: string[];
  className?: string;
};

const DEFAULT_CAPTIONS = [
  "Connect your repo — Scenario drives your real UI.",
  "Describe the flow, or let the AI planner map it out.",
  "Captions and voice-over are generated automatically.",
  "Ship a polished, deterministic demo in a single link.",
];

/**
 * A premium *mock* video player. There is no real media file — clicking play
 * animates a scrubber, a light sweep and a rotating caption to sell the demo
 * artifact. The scrubber is seekable for a touch of interactivity.
 */
export function SharePlayer({
  color,
  durationSec,
  title,
  processing = false,
  captions = DEFAULT_CAPTIONS,
  className,
}: SharePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const finished = elapsed >= durationSec && durationSec > 0;
  const progress = durationSec > 0 ? Math.min(elapsed / durationSec, 1) : 0;

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
  }, []);

  useEffect(() => {
    if (!playing) {
      stopLoop();
      return;
    }

    const tick = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const delta = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      setElapsed((prev) => {
        const next = prev + delta;
        if (next >= durationSec) {
          setPlaying(false);
          return durationSec;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return stopLoop;
  }, [playing, durationSec, stopLoop]);

  useEffect(() => stopLoop, [stopLoop]);

  const toggle = () => {
    if (processing) return;
    if (finished) {
      setElapsed(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const seek = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (processing || durationSec <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    setElapsed(ratio * durationSec);
    lastTsRef.current = null;
  };

  const captionIndex =
    captions.length > 0
      ? Math.min(
          Math.floor(progress * captions.length),
          captions.length - 1,
        )
      : 0;
  const CenterIcon = finished ? RotateCcw : playing ? Pause : Play;

  return (
    <div
      className={cn(
        "group/player relative isolate aspect-video w-full select-none overflow-hidden rounded-2xl border border-border/70 bg-[#0b0d10] shadow-2xl shadow-black/50 ring-1 ring-white/5",
        className,
      )}
    >
      <style>{sweepKeyframes}</style>

      {/* Brand gradient + texture */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `radial-gradient(90% 130% at 16% -10%, color-mix(in oklch, ${color} 62%, transparent), transparent 60%), radial-gradient(80% 90% at 100% 110%, color-mix(in oklch, ${color} 26%, transparent), transparent 55%), linear-gradient(160deg, #161b20, #0b0d10)`,
        }}
      />
      <div className="bg-grid absolute inset-0 -z-10 opacity-35" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_100%_at_50%_0%,transparent,rgba(0,0,0,0.35))]" />

      {/* Light sweep while playing */}
      {playing ? (
        <div
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
            animation: "scenario-sweep 3.2s ease-in-out infinite",
          }}
        />
      ) : null}

      {/* Top row: mock tag + audio equalizer */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
          <span className="inline-block size-1.5 rounded-full bg-primary" />
          Deterministic preview
        </span>
        {playing && !muted ? (
          <Equalizer />
        ) : (
          <span className="rounded-full border border-white/15 bg-black/40 px-2 py-1 font-mono text-[11px] text-white/70 backdrop-blur">
            {formatDuration(durationSec)}
          </span>
        )}
      </div>

      {/* Center affordance */}
      <div className="absolute inset-0 grid place-items-center">
        {processing ? (
          <div className="flex flex-col items-center gap-2 text-white/80">
            <LoaderCircle className="size-7 animate-spin" />
            <span className="text-xs font-medium">Processing…</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={toggle}
            aria-label={finished ? "Replay" : playing ? "Pause" : "Play"}
            className={cn(
              "grid size-16 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/30 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-20",
              playing && "opacity-0 group-hover/player:opacity-100",
            )}
          >
            <CenterIcon
              className={cn("size-7 sm:size-8", !playing && !finished && "translate-x-0.5 fill-current")}
            />
          </button>
        )}
      </div>

      {/* Faux live caption */}
      {playing && captions.length > 0 && !muted ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-6 sm:bottom-20">
          <span className="max-w-[85%] text-balance rounded-lg bg-black/55 px-3 py-1.5 text-center text-sm font-medium text-white/95 backdrop-blur-sm">
            {captions[captionIndex]}
          </span>
        </div>
      ) : null}

      {/* Control bar */}
      {!processing ? (
        <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3 sm:p-4">
          {/* Scrubber */}
          <button
            type="button"
            onClick={seek}
            aria-label="Seek"
            className="group/scrub relative block h-1.5 w-full cursor-pointer rounded-full bg-white/20"
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{ width: `${progress * 100}%` }}
            />
            <span
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow-[0_0_10px_var(--primary)] transition-opacity group-hover/scrub:opacity-100"
              style={{ left: `${progress * 100}%` }}
            />
          </button>

          <div className="flex items-center gap-3 text-white/85">
            <button
              type="button"
              onClick={toggle}
              aria-label={finished ? "Replay" : playing ? "Pause" : "Play"}
              className="grid size-8 place-items-center rounded-md transition-colors hover:bg-white/15"
            >
              <CenterIcon className={cn("size-4", !playing && !finished && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
              className="grid size-8 place-items-center rounded-md transition-colors hover:bg-white/15"
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <span className="font-mono text-xs tabular-nums text-white/80">
              {formatDuration(Math.floor(elapsed))} / {formatDuration(durationSec)}
            </span>
            <span className="ml-auto truncate text-xs text-white/70" title={title}>
              {title}
            </span>
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-md transition-colors hover:bg-white/15"
            >
              <Maximize2 className="size-4" />
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Equalizer() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-0.5 rounded-full bg-primary"
          style={{
            height: "100%",
            transformOrigin: "bottom",
            animation: `scenario-eq 0.9s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

const sweepKeyframes = `
@keyframes scenario-sweep {
  0% { transform: translateX(0) skewX(-12deg); }
  60% { transform: translateX(420%) skewX(-12deg); }
  100% { transform: translateX(420%) skewX(-12deg); }
}
@keyframes scenario-eq {
  0%, 100% { transform: scaleY(0.35); }
  50% { transform: scaleY(1); }
}
`;
