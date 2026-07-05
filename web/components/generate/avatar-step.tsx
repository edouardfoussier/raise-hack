"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Circle,
  Clock,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAssets } from "@/lib/assets-store";
import { cn } from "@/lib/utils";

import { OnBrandToggle } from "./on-brand-toggle";

/**
 * Step 3 · Avatar. Toggle → avatar picker from Assets (saved photos). If none,
 * a "Take a photo" button opens the webcam (getUserMedia), captures a still and
 * saves it to Assets. The lip-sync avatar itself is STUBBED — we only capture
 * and show the photo with a "coming soon" badge; no lip-sync API is called.
 */
export function AvatarStep({
  enabled,
  setEnabled,
  selectedPhotoId,
  setSelectedPhotoId,
}: {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  selectedPhotoId: string | null;
  setSelectedPhotoId: (id: string | null) => void;
}) {
  const { photos, addPhoto, removePhoto } = useAssets();
  const [capturing, setCapturing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file (PNG, JPG, WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const saved = addPhoto({
        name: "Uploaded photo",
        dataUrl: reader.result,
        source: "upload",
      });
      setSelectedPhotoId(saved.id);
      toast.success("Photo saved to Assets");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <UserRound className="size-4" />
          </span>
          <div>
            <h2 className="font-heading text-base font-semibold tracking-tight">
              Add a talking avatar?
            </h2>
            <p className="text-xs text-muted-foreground">
              Pick a saved photo or capture one — lip-sync arrives soon.
            </p>
          </div>
        </div>
        <OnBrandToggle checked={enabled} onChange={setEnabled} label="Avatar" />
      </div>

      {!enabled ? (
        <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
          No avatar — the demo shows your app only.
        </div>
      ) : capturing ? (
        <WebcamCapture
          onCancel={() => setCapturing(false)}
          onCapture={(dataUrl) => {
            const saved = addPhoto({
              name: "Webcam capture",
              dataUrl,
              source: "webcam",
            });
            setSelectedPhotoId(saved.id);
            setCapturing(false);
            toast.success("Photo saved to Assets");
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Coming-soon banner (STUB) */}
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            <Clock className="size-3.5" />
            Lip-sync avatar — coming soon. We save the photo now; narration still
            plays as voice-over.
          </div>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {photos.map((p) => {
                const selected = p.id === selectedPhotoId;
                return (
                  <div key={p.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoId(selected ? null : p.id)}
                      aria-pressed={selected}
                      className={cn(
                        "relative block aspect-square w-full overflow-hidden rounded-xl border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.dataUrl}
                        alt={p.name}
                        className="size-full object-cover"
                      />
                      {selected && (
                        <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" />
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-black/40 px-1.5 py-0.5 text-[10px] text-white">
                        lip-sync soon
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label="Delete photo"
                      onClick={() => {
                        removePhoto(p.id);
                        if (selected) setSelectedPhotoId(null);
                      }}
                      className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-6 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <UserRound className="size-5" />
              </span>
              <p className="mt-2 text-sm font-medium">No photos yet</p>
              <p className="text-xs text-muted-foreground">
                Take a photo with your webcam or upload one.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button className="gap-1.5" onClick={() => setCapturing(true)}>
              <Camera className="size-4" />
              Take a photo
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => fileRef.current?.click()}
            >
              <UploadCloud className="size-4" />
              Upload
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
        </div>
      )}
    </div>
  );
}

/* ── Webcam capture ─────────────────────────────────────────────────────── */

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
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
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
      <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl border border-border bg-black">
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
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { stop(); onCancel(); }}>
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
