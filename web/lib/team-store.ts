"use client";

/**
 * Client-side team store.
 *
 * NO database — the seed team comes from `lib/mock-data.ts` (the demo owner),
 * and members added through the "Add a team member" modal live in localStorage
 * so they persist across reloads within the browser. Deliberately small: this
 * is a real, working local store, not a fake list.
 */

import { useCallback, useEffect, useState } from "react";

import type { TeamMember, TeamRole } from "./types";

/** A member the user added at runtime (owner/seed members are not stored here). */
export type AddedMember = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
};

const STORAGE_KEY = "scenario:team:v1";

/** Deterministic, offline SVG avatar (data URI) from initials — matches seed style. */
function avatarDataUri(initials: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a4d"/><stop offset="1" stop-color="#ff5a1f"/></linearGradient></defs><rect width="128" height="128" rx="24" fill="url(#g)"/><text x="50%" y="50%" dy=".35em" font-family="Geist, Inter, system-ui, sans-serif" font-size="52" font-weight="600" fill="#04110f" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function load(): AddedMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AddedMember[]) : [];
  } catch {
    return [];
  }
}

function save(members: AddedMember[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch {
    // best-effort
  }
}

function newId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `member_${rand}`;
}

/** Turn an AddedMember into the shared TeamMember view-model shape. */
export function toTeamMember(m: AddedMember): TeamMember {
  return {
    id: m.id,
    name: m.name,
    avatarUrl: avatarDataUri(initialsOf(m.name)),
    role: m.role,
  };
}

export function useTeamStore() {
  const [added, setAdded] = useState<AddedMember[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAdded(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setAdded(load());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addMember = useCallback(
    (input: { name: string; email: string; role: TeamRole }): AddedMember => {
      const member: AddedMember = { ...input, id: newId() };
      setAdded((prev) => {
        const next = [...prev, member];
        save(next);
        return next;
      });
      return member;
    },
    [],
  );

  const removeMember = useCallback((id: string) => {
    setAdded((prev) => {
      const next = prev.filter((m) => m.id !== id);
      save(next);
      return next;
    });
  }, []);

  return { hydrated, added, addMember, removeMember };
}
