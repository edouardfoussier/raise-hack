"use client";

/**
 * Client-side Assets store for the Generate wizard.
 *
 * NO database — everything lives in localStorage so voices and captured photos
 * persist across reloads within the browser. Two asset kinds:
 *
 *   • voices  — seeded with "Edouard (cloned)" whose `voiceId` is the sentinel
 *               "default" (the server maps that to its configured GRADIUM_VOICE_ID,
 *               keeping the real id out of client code). Extra voices can carry a
 *               real Gradium voice id.
 *   • photos  — avatar stills captured from the webcam or uploaded, stored as
 *               data URLs (used for the STUBBED lip-sync avatar picker).
 *
 * Exposes a `useAssets()` hook returning the current lists plus mutators, and a
 * couple of pure helpers for reading the seed outside React.
 */

import { useCallback, useEffect, useState } from "react";

export type VoiceAsset = {
  id: string;
  /** Human label shown on the picker card. */
  name: string;
  /**
   * Gradium voice id to send to /api/generate. "default" = use the server's
   * configured GRADIUM_VOICE_ID (the seed cloned voice).
   */
  voiceId: string;
  /** Seeded voices can't be deleted from the UI. */
  seeded?: boolean;
};

export type PhotoAsset = {
  id: string;
  /** Human label, e.g. "Webcam capture". */
  name: string;
  /** data: URL of the still image. */
  dataUrl: string;
  /** epoch ms — for sorting newest-first. */
  createdAt: number;
  source: "webcam" | "upload";
};

type AssetsState = {
  voices: VoiceAsset[];
  photos: PhotoAsset[];
};

const STORAGE_KEY = "scenario:assets:v1";

/** The always-present cloned voice. Its real Gradium id stays server-side. */
export const SEED_VOICE: VoiceAsset = {
  id: "voice_edouard_cloned",
  name: "Edouard (cloned)",
  voiceId: "default",
  seeded: true,
};

function emptyState(): AssetsState {
  return { voices: [SEED_VOICE], photos: [] };
}

function load(): AssetsState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<AssetsState>;
    const voices = Array.isArray(parsed.voices) ? parsed.voices : [];
    const photos = Array.isArray(parsed.photos) ? parsed.photos : [];
    // Guarantee the seed voice is always present and first.
    const hasSeed = voices.some((v) => v.id === SEED_VOICE.id);
    return {
      voices: hasSeed ? voices : [SEED_VOICE, ...voices],
      photos,
    };
  } catch {
    return emptyState();
  }
}

function save(state: AssetsState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / serialization errors — assets are best-effort.
  }
}

function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

export function useAssets() {
  const [state, setState] = useState<AssetsState>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR/CSR mismatch).
  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  // Keep multiple tabs / components in sync.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setState(load());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: AssetsState) => {
    setState(next);
    save(next);
  }, []);

  const addPhoto = useCallback(
    (photo: Omit<PhotoAsset, "id" | "createdAt">): PhotoAsset => {
      const full: PhotoAsset = {
        ...photo,
        id: newId("photo"),
        createdAt: Date.now(),
      };
      setState((prev) => {
        const next = { ...prev, photos: [full, ...prev.photos] };
        save(next);
        return next;
      });
      return full;
    },
    [],
  );

  const removePhoto = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, photos: prev.photos.filter((p) => p.id !== id) };
      save(next);
      return next;
    });
  }, []);

  const addVoice = useCallback(
    (voice: Omit<VoiceAsset, "id">): VoiceAsset => {
      const full: VoiceAsset = { ...voice, id: newId("voice") };
      setState((prev) => {
        const next = { ...prev, voices: [...prev.voices, full] };
        save(next);
        return next;
      });
      return full;
    },
    [],
  );

  const removeVoice = useCallback((id: string) => {
    setState((prev) => {
      const target = prev.voices.find((v) => v.id === id);
      if (target?.seeded) return prev; // can't delete the seed voice
      const next = { ...prev, voices: prev.voices.filter((v) => v.id !== id) };
      save(next);
      return next;
    });
  }, []);

  return {
    hydrated,
    voices: state.voices,
    photos: state.photos,
    addPhoto,
    removePhoto,
    addVoice,
    removeVoice,
    persist,
  };
}
