import { LoaderCircle, Play } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";

type VideoPosterProps = {
  color: string;
  durationSec?: number;
  processing?: boolean;
  /** Size of the central play affordance. */
  playSize?: "sm" | "md" | "lg";
  className?: string;
};

const playSizes: Record<NonNullable<VideoPosterProps["playSize"]>, string> = {
  sm: "size-9 [&>svg]:size-4",
  md: "size-12 [&>svg]:size-5",
  lg: "size-16 [&>svg]:size-7",
};

/**
 * Deterministic gradient "poster" for a video. Uses the video's brand color to
 * render a premium dark thumbnail with a play affordance — no real media needed.
 */
export function VideoPoster({
  color,
  durationSec,
  processing = false,
  playSize = "md",
  className,
}: VideoPosterProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-[#0b0d10]",
        className,
      )}
    >
      {/* Colored glow derived from the video's brand color. */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `radial-gradient(90% 120% at 18% 0%, color-mix(in oklch, ${color} 60%, transparent), transparent 60%), linear-gradient(160deg, #161b20, #0b0d10)`,
        }}
      />
      {/* Faint grid texture. */}
      <div className="bg-grid absolute inset-0 -z-10 opacity-40" />

      <div className="absolute inset-0 grid place-items-center">
        {processing ? (
          <div className="flex flex-col items-center gap-2 text-white/80">
            <LoaderCircle className="size-6 animate-spin" />
            <span className="text-xs font-medium">Processing…</span>
          </div>
        ) : (
          <span
            className={cn(
              "grid place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 backdrop-blur-sm transition-transform duration-200 group-hover/poster:scale-105",
              playSizes[playSize],
            )}
          >
            <Play className="translate-x-px fill-current" />
          </span>
        )}
      </div>

      {typeof durationSec === "number" && !processing ? (
        <span className="absolute right-2 bottom-2 rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[11px] text-white/90 backdrop-blur-sm">
          {formatDuration(durationSec)}
        </span>
      ) : null}
    </div>
  );
}
