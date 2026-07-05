import { Captions, Eye } from "lucide-react";

/**
 * Hero "browser window" showing a REAL Diffender-generated demo — a deja-bu
 * reception walkthrough — autoplaying muted on loop. Purely presentational.
 */
export function HeroPreview() {
  return (
    <div className="relative rounded-2xl border border-border/80 bg-card/80 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <div className="ml-3 flex h-7 flex-1 items-center rounded-lg border border-border/70 bg-background/60 px-3 font-mono text-xs text-muted-foreground">
          app.diffender.com
        </div>
      </div>

      {/* Player — a real generated demo, autoplay muted loop. */}
      <div className="p-3">
        <video
          className="aspect-video w-full rounded-xl bg-[#0b0d10] object-cover"
          src="/videos/deja-reception.mp4"
          poster="/videos/deja-reception.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="A Diffender-generated demo of a delivery-reception flow"
        />

        {/* Caption + metadata bar */}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-foreground/90">
            <Captions className="size-4 text-primary" />
            <span className="font-medium">
              “Reception recorded — stock updated 60 → 72.”
            </span>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
            <Eye className="size-3.5" />
            <span className="tabular-nums">1,284 views</span>
          </div>
        </div>
      </div>
    </div>
  );
}
