"use client";

/**
 * Client-side edit store for extracted design systems.
 *
 * The seed design systems (`lib/design-systems.ts`) are read-only server data.
 * This store layers the user's EDITS on top, persisted in localStorage:
 *
 *   • removedTokenIds — tokens/components the user deleted from a system. The
 *     page filters the seed DS through this set so deletions survive reloads.
 *   • addedProjects   — projects added via live extraction (`POST /api/extract`).
 *     Each carries its own normalized DesignSystem so it renders identically to
 *     the seeds.
 *
 * Everything is best-effort and offline — no database. Exposes a `useDsStore()`
 * hook plus pure helpers for reading outside React.
 */

import { useCallback, useEffect, useState } from "react";

import type { DesignSystem, DsProject } from "./design-systems";

const STORAGE_KEY = "scenario:ds-edits:v1";

type StoreState = {
  /** projectId -> set of removed token ids (stored as arrays for JSON). */
  removed: Record<string, string[]>;
  /** Extra projects added at runtime via live extraction. */
  addedProjects: DsProject[];
};

function emptyState(): StoreState {
  return { removed: {}, addedProjects: [] };
}

function load(): StoreState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    return {
      removed:
        parsed.removed && typeof parsed.removed === "object" ? parsed.removed : {},
      addedProjects: Array.isArray(parsed.addedProjects)
        ? parsed.addedProjects
        : [],
    };
  } catch {
    return emptyState();
  }
}

function save(state: StoreState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / serialization errors — edits are best-effort.
  }
}

/**
 * Apply the user's removals to a seed DesignSystem, returning a pruned copy.
 * Pure — safe to call during render.
 */
export function applyRemovals(
  ds: DesignSystem,
  removedIds: string[] | undefined,
): DesignSystem {
  if (!removedIds || removedIds.length === 0) return ds;
  const gone = new Set(removedIds);
  const keep = <T extends { id: string }>(arr: T[]) =>
    arr.filter((t) => !gone.has(t.id));
  return {
    ...ds,
    colors: keep(ds.colors),
    typography: keep(ds.typography),
    spacing: keep(ds.spacing),
    radii: keep(ds.radii),
    shadows: keep(ds.shadows),
    motion: keep(ds.motion),
    breakpoints: keep(ds.breakpoints),
    components: keep(ds.components),
  };
}

export function useDsStore() {
  const [state, setState] = useState<StoreState>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setState(load());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const removeToken = useCallback((projectId: string, tokenId: string) => {
    setState((prev) => {
      const current = prev.removed[projectId] ?? [];
      if (current.includes(tokenId)) return prev;
      const next: StoreState = {
        ...prev,
        removed: { ...prev.removed, [projectId]: [...current, tokenId] },
      };
      save(next);
      return next;
    });
  }, []);

  const restoreProject = useCallback((projectId: string) => {
    setState((prev) => {
      if (!prev.removed[projectId]?.length) return prev;
      const removed = { ...prev.removed };
      delete removed[projectId];
      const next = { ...prev, removed };
      save(next);
      return next;
    });
  }, []);

  const addProject = useCallback((project: DsProject) => {
    setState((prev) => {
      const next: StoreState = {
        ...prev,
        addedProjects: [
          project,
          ...prev.addedProjects.filter((p) => p.id !== project.id),
        ],
      };
      save(next);
      return next;
    });
  }, []);

  const removedFor = useCallback(
    (projectId: string) => state.removed[projectId] ?? [],
    [state.removed],
  );

  return {
    hydrated,
    addedProjects: state.addedProjects,
    removed: state.removed,
    removedFor,
    removeToken,
    restoreProject,
    addProject,
  };
}
