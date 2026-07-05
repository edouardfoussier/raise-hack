"use client";

import { useRef, useState } from "react";
import {
  AudioLines,
  Check,
  ChevronLeft,
  Clapperboard,
  Download,
  LoaderCircle,
  Monitor,
  RotateCcw,
  ScrollText,
  Smartphone,
  Sparkles,
  UserRound,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAssets } from "@/lib/assets-store";
import { cn } from "@/lib/utils";

import { AvatarStep } from "./avatar-step";
import { OnBrandToggle } from "./on-brand-toggle";
import { VoicePicker } from "./voice-picker";

/** Prefill: the deja-bu preview + a safe READ-ONLY flow (matches /api/generate's dejaEnv). */
const DEFAULT_URL =
  "https://deja-bu-npi9s11fh-edouard-foussiers-projects.vercel.app";
const DEFAULT_GOAL =
  "Open the Catalogue and search for Accent Ginger, then open the product.";

type VideoType = "demo";
type Device = "mobile" | "desktop";

type GenerateResponse = {
  id: string;
  videoUrl: string;
  gifUrl?: string;
  device?: Device;
  error?: string;
};

const STEPS = [
  { key: "source", label: "Source", icon: Clapperboard },
  { key: "voice", label: "Voice-over", icon: AudioLines },
  { key: "avatar", label: "Avatar", icon: UserRound },
  { key: "script", label: "Script", icon: ScrollText },
  { key: "generate", label: "Generate", icon: Wand2 },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

export function GenerateWizard() {
  const assets = useAssets();

  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex].key;

  // Step 1 — Source
  const [url, setUrl] = useState(DEFAULT_URL);
  const [videoType, setVideoType] = useState<VideoType>("demo");
  const [device, setDevice] = useState<Device>("mobile");

  // Step 2 — Voice-over
  const [voiceOn, setVoiceOn] = useState(true);
  const [voiceId, setVoiceId] = useState<string>("voice_edouard_cloned");

  // Step 3 — Avatar
  const [avatarOn, setAvatarOn] = useState(false);
  const [avatarPhotoId, setAvatarPhotoId] = useState<string | null>(null);

  // Step 4 — Script (per-step lines; length adapts to the flow)
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [script, setScript] = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);

  // Step 5 — Generate
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const selectedVoice = assets.voices.find((v) => v.id === voiceId);

  function goNext() {
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  }
  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function canAdvance(from: StepKey): boolean {
    if (from === "source") {
      if (!url.trim()) {
        toast.error("Add an app URL first.");
        return false;
      }
      try {
        new URL(url.trim());
      } catch {
        toast.error("That doesn't look like a valid URL.");
        return false;
      }
    }
    return true;
  }

  function handleNext() {
    if (!canAdvance(step)) return;
    goNext();
  }

  async function handleGenerateScript() {
    if (!goal.trim()) {
      toast.error("Describe the objective first.");
      return;
    }
    setScriptLoading(true);
    try {
      const res = await fetch("/api/script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          goal: goal.trim(),
        }),
      });
      const data = (await res.json()) as { script?: string; error?: string };
      if (!res.ok || data.error || !data.script) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setScript(data.script);
      toast.success("Narration drafted", {
        description: "One line per step — edit them below before you generate.",
      });
    } catch (e) {
      toast.error("Couldn't draft a script", {
        description: (e as Error).message.slice(0, 200),
      });
    } finally {
      setScriptLoading(false);
    }
  }

  async function handleGenerate() {
    if (!url.trim() || !goal.trim()) {
      toast.error("An app URL and an objective are required.");
      return;
    }
    setLoading(true);
    setResult(null);
    const started = Date.now();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          goal: goal.trim(),
          device,
          captions: true,
          voice: voiceOn,
          voiceId: voiceOn ? selectedVoice?.voiceId ?? "default" : undefined,
          script: voiceOn && script.trim() ? script.trim() : undefined,
        }),
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
      requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
    } catch (e) {
      toast.error("Generation failed", {
        description: (e as Error).message.slice(0, 200),
      });
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setResult(null);
    setStepIndex(0);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Stepper current={stepIndex} onStep={(i) => setStepIndex(i)} />

      <div className="p-5 sm:p-6">
        {step === "source" && (
          <SourceStep
            url={url}
            setUrl={setUrl}
            videoType={videoType}
            setVideoType={setVideoType}
            device={device}
            setDevice={setDevice}
          />
        )}

        {step === "voice" && (
          <VoiceStep
            enabled={voiceOn}
            setEnabled={setVoiceOn}
            voices={assets.voices}
            voiceId={voiceId}
            setVoiceId={setVoiceId}
          />
        )}

        {step === "avatar" && (
          <AvatarStep
            enabled={avatarOn}
            setEnabled={setAvatarOn}
            selectedPhotoId={avatarPhotoId}
            setSelectedPhotoId={setAvatarPhotoId}
          />
        )}

        {step === "script" && (
          <ScriptStep
            goal={goal}
            setGoal={setGoal}
            script={script}
            setScript={setScript}
            loading={scriptLoading}
            onGenerate={handleGenerateScript}
          />
        )}

        {step === "generate" && (
          <GenerateStep
            url={url}
            goal={goal}
            device={device}
            voiceOn={voiceOn}
            voiceName={selectedVoice?.name}
            avatarOn={avatarOn}
            hasScript={Boolean(script.trim())}
            loading={loading}
            result={result}
            videoRef={videoRef}
            onGenerate={handleGenerate}
            onReset={resetAll}
          />
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between border-t border-border bg-background/40 px-5 py-3 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={goBack}
          disabled={stepIndex === 0 || loading}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>

        <span className="text-xs text-muted-foreground">
          Step {stepIndex + 1} of {STEPS.length}
        </span>

        {step !== "generate" ? (
          <Button size="sm" className="gap-1.5" onClick={handleNext}>
            Continue
            <Sparkles className="size-3.5" />
          </Button>
        ) : (
          <span className="w-[92px]" aria-hidden />
        )}
      </div>
    </div>
  );
}

/* ── Stepper header ─────────────────────────────────────────────────────── */

function Stepper({
  current,
  onStep,
}: {
  current: number;
  onStep: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-background/40 px-3 py-3 sm:px-5">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = s.icon;
        return (
          <div key={s.key} className="flex items-center">
            <button
              type="button"
              onClick={() => onStep(i)}
              disabled={i > current}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : done
                    ? "text-foreground hover:bg-muted"
                    : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-[10px] font-semibold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3" /> : <Icon className="size-3" />}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "mx-0.5 h-px w-3 sm:w-5",
                  i < current ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Step 1 · Source ────────────────────────────────────────────────────── */

function SourceStep({
  url,
  setUrl,
  videoType,
  setVideoType,
  device,
  setDevice,
}: {
  url: string;
  setUrl: (v: string) => void;
  videoType: VideoType;
  setVideoType: (v: VideoType) => void;
  device: Device;
  setDevice: (v: Device) => void;
}) {
  const DEVICES: { key: Device; label: string; desc: string; icon: typeof Smartphone }[] = [
    {
      key: "mobile",
      label: "Mobile",
      desc: "iPhone portrait · touch taps · on-screen keyboard.",
      icon: Smartphone,
    },
    {
      key: "desktop",
      label: "Desktop",
      desc: "Landscape viewport · arrow cursor.",
      icon: Monitor,
    },
  ];
  const VIDEO_TYPES: {
    key: VideoType;
    label: string;
    desc: string;
    soon?: boolean;
  }[] = [
    {
      key: "demo",
      label: "Demo video",
      desc: "A deterministic walkthrough of a real flow in your app.",
    },
  ];

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Clapperboard className="size-4" />}
        title="What should we film?"
        subtitle="Point Scenario at a live app URL and choose the kind of video."
      />

      <div className="space-y-1.5">
        <label htmlFor="wiz-url" className="text-xs font-medium text-muted-foreground">
          App URL
        </label>
        <Input
          id="wiz-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-app.example.com"
          className="h-9 font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Prefilled with the déjà-bu preview — a safe read-only target.
        </p>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Device</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEVICES.map((d) => {
            const selected = device === d.key;
            const Icon = d.icon;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setDevice(d.key)}
                aria-pressed={selected}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-background/40 hover:border-primary/30",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg ring-1",
                    selected
                      ? "bg-primary/10 text-primary ring-primary/20"
                      : "bg-muted text-muted-foreground ring-border",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{d.label}</span>
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
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {d.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Video type</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {VIDEO_TYPES.map((t) => {
            const selected = videoType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => !t.soon && setVideoType(t.key)}
                disabled={t.soon}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                  selected
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-background/40 hover:border-primary/30",
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-medium">{t.label}</span>
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-full border",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {selected && <Check className="size-2.5" />}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{t.desc}</span>
              </button>
            );
          })}
          <div className="flex flex-col items-start gap-1 rounded-xl border border-dashed border-border p-3 text-left opacity-70">
            <span className="text-sm font-medium text-muted-foreground">
              More types soon
            </span>
            <span className="text-xs text-muted-foreground">
              Feature tours, changelog clips, onboarding — coming next.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 2 · Voice-over ────────────────────────────────────────────────── */

function VoiceStep({
  enabled,
  setEnabled,
  voices,
  voiceId,
  setVoiceId,
}: {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  voices: ReturnType<typeof useAssets>["voices"];
  voiceId: string;
  setVoiceId: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        icon={<AudioLines className="size-4" />}
        title="Add a voice-over?"
        subtitle="Narrate the demo in a cloned voice from your Assets."
        action={
          <OnBrandToggle
            checked={enabled}
            onChange={setEnabled}
            label="Voice-over"
          />
        }
      />

      {enabled ? (
        <VoicePicker voices={voices} value={voiceId} onChange={setVoiceId} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
          No voice-over — the demo will play with captions only.
        </div>
      )}
    </div>
  );
}

/* ── Step 4 · Script ────────────────────────────────────────────────────── */

function ScriptStep({
  goal,
  setGoal,
  script,
  setScript,
  loading,
  onGenerate,
}: {
  goal: string;
  setGoal: (v: string) => void;
  script: string;
  setScript: (v: string) => void;
  loading: boolean;
  onGenerate: () => void;
}) {
  const lineList = script.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lineCount = lineList.length;

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<ScrollText className="size-4" />}
        title="Write the narration"
        subtitle="One spoken line per step — the video's length adapts to the flow."
      />

      <div className="space-y-1.5">
        <label htmlFor="wiz-goal" className="text-xs font-medium text-muted-foreground">
          Objective
        </label>
        <textarea
          id="wiz-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
          placeholder="Describe the flow to demo, in plain English…"
          className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>

      <div>
        <Button
          onClick={onGenerate}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Wand2 className="size-4" />
          )}
          {loading ? "Drafting…" : script ? "Redraft lines" : "Draft narration"}
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="wiz-script"
            className="text-xs font-medium text-muted-foreground"
          >
            Narration — one line per step
          </label>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>
        <textarea
          id="wiz-script"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={6}
          placeholder={"Draft above, then edit — one line per step, e.g.\nOpen the Catalogue\nSearch for Accent Ginger\nOpen the product"}
          className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <p className="text-xs text-muted-foreground">
          Each line narrates one step and stays on screen for as long as it takes
          to speak — so the voice always matches the action and the length adapts
          to the flow. Leave empty to auto-write a line per step.
        </p>
      </div>
    </div>
  );
}

/* ── Step 5 · Generate ──────────────────────────────────────────────────── */

function GenerateStep({
  url,
  goal,
  device,
  voiceOn,
  voiceName,
  avatarOn,
  hasScript,
  loading,
  result,
  videoRef,
  onGenerate,
  onReset,
}: {
  url: string;
  goal: string;
  device: Device;
  voiceOn: boolean;
  voiceName?: string;
  avatarOn: boolean;
  hasScript: boolean;
  loading: boolean;
  result: GenerateResponse | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onGenerate: () => void;
  onReset: () => void;
}) {
  // The result device (what was actually rendered) wins over the current picker.
  const shownDevice = result?.device ?? device;
  const isMobile = shownDevice !== "desktop";
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <StepHeader
          icon={<Wand2 className="size-4" />}
          title="Review & generate"
          subtitle="Scenario plans, records and narrates a deterministic replay."
        />

        <dl className="space-y-2.5 rounded-xl border border-border bg-background/40 p-4 text-sm">
          <SummaryRow label="App URL" value={url} mono />
          <SummaryRow label="Objective" value={goal} />
          <SummaryRow
            label="Device"
            value={isMobile ? "Mobile · iPhone portrait" : "Desktop · landscape"}
          />
          <SummaryRow
            label="Voice-over"
            value={voiceOn ? voiceName ?? "On" : "Off (captions only)"}
          />
          <SummaryRow
            label="Script"
            value={hasScript ? "Edited narration" : "Auto from captions"}
          />
          <SummaryRow
            label="Avatar"
            value={avatarOn ? "On · lip-sync coming soon" : "Off"}
          />
        </dl>

        <div className="flex items-center gap-3">
          <Button onClick={onGenerate} disabled={loading} size="lg" className="gap-2">
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            {loading ? "Generating…" : "Generate demo"}
          </Button>
          {loading && (
            <span className="text-xs text-muted-foreground">
              Planning, recording &amp; narrating — this takes ~1–2 min.
            </span>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="relative grid place-items-center overflow-hidden rounded-xl bg-[#0b0d10] p-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(90% 120% at 80% 0%, color-mix(in oklch, var(--primary) 45%, transparent), transparent 60%), linear-gradient(160deg, #161b20, #0b0d10)",
          }}
        />
        {/* Portrait (mobile) → narrow column; landscape (desktop) → wide.
            The container just bounds width; the video/placeholder centers and
            fits inside via object-contain + a shared max-height. */}
        <div
          className={cn(
            "relative mx-auto w-full",
            isMobile ? "max-w-[260px]" : "max-w-[440px]",
          )}
        >
          {result ? (
            <div className="space-y-3">
              <video
                ref={videoRef}
                src={result.videoUrl}
                controls
                playsInline
                muted
                className="mx-auto block h-auto max-h-[60vh] w-full rounded-xl bg-black object-contain ring-1 ring-white/10"
              />
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={onReset}>
                  <RotateCcw className="size-3.5" />
                  New demo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  className="gap-1.5"
                  render={<a href={result.videoUrl} download={`${result.id}.mp4`} />}
                >
                  <Download className="size-3.5" />
                  Download
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "grid w-full place-items-center rounded-xl border border-dashed border-white/15 text-center",
                isMobile ? "aspect-[9/19.5]" : "aspect-video",
              )}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-2 text-white/80">
                  <LoaderCircle className="size-6 animate-spin text-primary" />
                  <span className="text-xs font-medium">Filming your demo…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 px-6 text-white/50">
                  <span className="grid size-11 place-items-center rounded-2xl bg-white/5 text-primary ring-1 ring-white/10">
                    <Wand2 className="size-5" />
                  </span>
                  <span className="text-xs">Your generated demo will play here.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right text-sm",
          mono && "font-mono text-xs",
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

/* ── Shared step header ─────────────────────────────────────────────────── */

function StepHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          {icon}
        </span>
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
