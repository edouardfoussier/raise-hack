"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Camera,
  Circle,
  Images,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAssets } from "@/lib/assets-store";
import { cn } from "@/lib/utils";

/** Deterministic bar heights (%) for the little voice waveform. */
const WAVE = [30, 60, 45, 80, 52, 70, 38, 64, 48, 74, 42, 58, 36, 66];

/**
 * Client-side manager for the wizard's Assets store (voices + photos, backed by
 * localStorage). Lists and manages the same data the Generate wizard reads.
 */
export function AssetsManager() {
  const { hydrated, voices, photos, removeVoice, addPhoto, removePhoto } =
    useAssets();

  const fileRef = useRef<HTMLInputElement>(null);
  const [capturing, setCapturing] = useState(false);

  function handleUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      addPhoto({ name: "Uploaded photo", dataUrl: reader.result, source: "upload" });
      toast.success("Photo saved to Assets");
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = ""; // allow re-upload of same file
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Voices */}
      <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <AudioLines className="size-4" />
          </span>
          <div>
            <h2 className="font-heading text-base font-medium">Voices</h2>
            <p className="text-xs text-muted-foreground">
              Voices the wizard can narrate your demos with.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {hydrated &&
            voices.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <AudioLines className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{v.name}</p>
                    {v.seeded && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        <Sparkles className="size-2.5" />
                        Cloned
                      </span>
                    )}
                  </div>
                  <span
                    className="mt-1.5 flex h-3.5 items-center gap-[2px]"
                    aria-hidden="true"
                  >
                    {WAVE.map((h, i) => (
                      <span
                        key={i}
                        className="w-full flex-1 rounded-full bg-primary/40"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </span>
                </div>
                {!v.seeded && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${v.name}`}
                    onClick={() => removeVoice(v.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
        </div>

        <div className="mt-auto pt-4">
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
            <Sparkles className="size-3.5" />
            Clone new voice
          </Button>
        </div>
      </div>

      {/* Photos / avatars */}
      <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Images className="size-4" />
          </span>
          <div>
            <h2 className="font-heading text-base font-medium">Avatar photos</h2>
            <p className="text-xs text-muted-foreground">
              Captured or uploaded stills — used for talking avatars (soon).
            </p>
          </div>
        </div>

        <div className="mt-4 flex-1">
          {capturing ? (
            <WebcamCapture
              onCancel={() => setCapturing(false)}
              onCapture={(dataUrl) => {
                addPhoto({
                  name: "Webcam capture",
                  dataUrl,
                  source: "webcam",
                });
                setCapturing(false);
                toast.success("Photo saved to Assets");
              }}
            />
          ) : hydrated && photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {photos.map((p) => (
                <div key={p.id} className="group relative">
                  <div className="aspect-square w-full overflow-hidden rounded-xl border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.dataUrl}
                      alt={p.name}
                      className="size-full object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/40 px-1.5 py-0.5 text-[10px] text-white">
                      {p.source === "webcam" ? (
                        <Camera className="size-2.5" />
                      ) : (
                        <UploadCloud className="size-2.5" />
                      )}
                      {p.source}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete photo"
                    onClick={() => removePhoto(p.id)}
                    className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "grid h-full min-h-[120px] place-items-center rounded-xl border border-dashed border-border bg-background/40 px-4 py-6 text-center",
              )}
            >
              <div>
                <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <UserRound className="size-5" />
                </span>
                <p className="mt-2 text-sm font-medium">No photos yet</p>
                <p className="text-xs text-muted-foreground">
                  Capture one in the Generate wizard, or upload here.
                </p>
              </div>
            </div>
          )}
        </div>

        {!capturing && (
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setCapturing(true)}
            >
              <Camera className="size-3.5" />
              Take a photo (webcam)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileRef.current?.click()}
            >
              <UploadCloud className="size-3.5" />
              Upload photo
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Upload photo"
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Webcam capture ─────────────────────────────────────────────────────── */

/**
 * getUserMedia webcam capture, ported from the Generate wizard's avatar step.
 * Captures a mirrored, center-cropped square still and hands back a JPEG data
 * URL. Stops all tracks on unmount/cancel so the camera light turns off.
 */
function WebcamCapture({
  onCapture,
  onCancel,
}: {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera not supported in this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e) {
        setError(
          (e as Error).name === "NotAllowedError"
            ? "Camera permission denied. Allow access and try again."
            : (e as Error).message || "Couldn't start the camera.",
        );
      }
    }
    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const size = Math.min(video.videoWidth, video.videoHeight) || 480;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Center-crop to a square, mirrored to match the live preview.
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stop();
    onCapture(dataUrl);
  }

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl border border-border bg-black">
        {error ? (
          <div className="grid size-full place-items-center px-6 text-center text-sm text-white/70">
            {error}
          </div>
        ) : (
          <>
            {/* Mirror the preview so it feels natural. */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="size-full -scale-x-100 object-cover"
            />
            {!ready && (
              <div className="absolute inset-0 grid place-items-center text-xs text-white/70">
                Starting camera…
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            stop();
            onCancel();
          }}
        >
          <X className="size-3.5" />
          Cancel
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={!ready || Boolean(error)}
          onClick={capture}
        >
          <Circle className="size-3.5 fill-current" />
          Capture
        </Button>
      </div>
    </div>
  );
}
