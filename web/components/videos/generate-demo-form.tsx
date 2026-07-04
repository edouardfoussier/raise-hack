"use client";

import { useRef, useState } from "react";
import {
  AudioLines,
  Captions,
  Download,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Prefill: the deja-bu preview + a safe READ-ONLY flow. */
const DEFAULT_URL =
  "https://deja-bu-npi9s11fh-edouard-foussiers-projects.vercel.app";
const DEFAULT_GOAL =
  "Open the Catalogue and search for Accent Ginger, then open the product.";

type GenerateResponse = {
  id: string;
  videoUrl: string;
  gifUrl?: string;
  error?: string;
};

/** A small on-brand toggle (flame when on). */
function Toggle({
  checked,
  onChange,
  icon,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        checked
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          "relative ml-1 h-3.5 w-6 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted-foreground/40",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-2.5 rounded-full bg-white transition-all",
            checked ? "left-3" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function GenerateDemoForm() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [captions, setCaptions] = useState(true);
  const [voice, setVoice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  async function handleGenerate() {
    if (!url.trim() || !goal.trim()) {
      toast.error("Add an app URL and a goal first.");
      return;
    }
    setLoading(true);
    setResult(null);
    const started = Date.now();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim(), goal: goal.trim(), captions, voice }),
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok || data.error) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setResult(data);
      const secs = Math.round((Date.now() - started) / 1000);
      toast.success("Demo generated", {
        description: `Your video is ready in ${secs}s.`,
      });
      // Autoplay the freshly generated clip (muted so browsers allow it).
      requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
    } catch (e) {
      toast.error("Generation failed", {
        description: (e as Error).message.slice(0, 200),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
        {/* ── Form ─────────────────────────────────────────────────────── */}
        <div className="border-border p-5 lg:border-r sm:p-6">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="font-heading text-base font-semibold tracking-tight">
                Generate a demo
              </h2>
              <p className="text-xs text-muted-foreground">
                Paste an app URL and a goal — Scenario films it for you.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="gen-url"
                className="text-xs font-medium text-muted-foreground"
              >
                App URL
              </label>
              <Input
                id="gen-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-app.example.com"
                disabled={loading}
                className="h-9 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="gen-goal"
                className="text-xs font-medium text-muted-foreground"
              >
                Goal
              </label>
              <textarea
                id="gen-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe the flow to demo, in plain English…"
                disabled={loading}
                rows={3}
                className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Toggle
                checked={captions}
                onChange={setCaptions}
                disabled={loading}
                icon={<Captions className="size-3.5" />}
                label="Captions"
              />
              <Toggle
                checked={voice}
                onChange={setVoice}
                disabled={loading}
                icon={<AudioLines className="size-3.5" />}
                label="Voice: Edouard"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={handleGenerate}
                disabled={loading}
                size="lg"
                className="gap-2"
              >
                {loading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Wand2 className="size-4" />
                )}
                {loading ? "Generating…" : "Generate"}
              </Button>
              {loading ? (
                <span className="text-xs text-muted-foreground">
                  Planning, recording &amp; narrating — this takes ~1–2 min.
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Preview ──────────────────────────────────────────────────── */}
        <div className="relative grid place-items-center bg-[#0b0d10] p-5 sm:p-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(90% 120% at 80% 0%, color-mix(in oklch, var(--primary) 45%, transparent), transparent 60%), linear-gradient(160deg, #161b20, #0b0d10)",
            }}
          />
          <div className="relative w-full max-w-[280px]">
            {result ? (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  src={result.videoUrl}
                  controls
                  playsInline
                  muted
                  className="aspect-[760/560] w-full rounded-xl bg-black ring-1 ring-white/10"
                />
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setResult(null);
                    }}
                  >
                    <RotateCcw className="size-3.5" />
                    New demo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    className="gap-1.5"
                    render={
                      <a href={result.videoUrl} download={`${result.id}.mp4`} />
                    }
                  >
                    <Download className="size-3.5" />
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid aspect-[760/560] w-full place-items-center rounded-xl border border-dashed border-white/15 text-center">
                {loading ? (
                  <div className="flex flex-col items-center gap-2 text-white/80">
                    <LoaderCircle className="size-6 animate-spin text-primary" />
                    <span className="text-xs font-medium">
                      Filming your demo…
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 px-6 text-white/50">
                    <span className="grid size-11 place-items-center rounded-2xl bg-white/5 text-primary ring-1 ring-white/10">
                      <Wand2 className="size-5" />
                    </span>
                    <span className="text-xs">
                      Your generated demo will play here.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
