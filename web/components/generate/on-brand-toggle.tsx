"use client";

import { cn } from "@/lib/utils";

/** A small on-brand switch (flame when on) — shared across wizard steps. */
export function OnBrandToggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
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
      {checked ? "On" : "Off"}
      <span
        className={cn(
          "relative ml-0.5 h-3.5 w-6 rounded-full transition-colors",
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
