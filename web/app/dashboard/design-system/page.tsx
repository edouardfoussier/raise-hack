import type { Metadata } from "next";
import { Palette, Sparkles } from "lucide-react";

import { GithubIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { DsSection } from "@/components/design-system/ds-section";
import { ColorSwatch } from "@/components/design-system/color-swatch";
import { ComponentGallery } from "@/components/design-system/component-gallery";
import { getProjects, getTeam } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Design System" };

/* Token values below mirror `app/globals.css` (`.dark`) for reference only —
   the swatch fills use the live theme utilities so they stay pixel-accurate. */
const paletteTokens = [
  { name: "Background", value: "oklch(0.15 0.006 236)", swatchClassName: "bg-background" },
  { name: "Card", value: "oklch(0.188 0.007 236)", swatchClassName: "bg-card" },
  { name: "Muted", value: "oklch(0.238 0.008 236)", swatchClassName: "bg-muted" },
  { name: "Secondary", value: "oklch(0.245 0.008 236)", swatchClassName: "bg-secondary" },
  { name: "Border", value: "oklch(1 0 0 / 9%)", swatchClassName: "bg-border" },
  { name: "Foreground", value: "oklch(0.965 0.004 220)", swatchClassName: "bg-foreground" },
  { name: "Muted fg", value: "oklch(0.71 0.014 230)", swatchClassName: "bg-muted-foreground" },
  { name: "Destructive", value: "oklch(0.64 0.2 22)", swatchClassName: "bg-destructive" },
] as const;

const chartTokens = [
  { name: "chart-1", swatchClassName: "bg-chart-1" },
  { name: "chart-2", swatchClassName: "bg-chart-2" },
  { name: "chart-3", swatchClassName: "bg-chart-3" },
  { name: "chart-4", swatchClassName: "bg-chart-4" },
  { name: "chart-5", swatchClassName: "bg-chart-5" },
] as const;

const typeScale = [
  {
    sample: "Ship the demo",
    meta: "Display · text-5xl / 600",
    cls: "text-4xl font-semibold tracking-tight sm:text-5xl",
  },
  {
    sample: "Deterministic demos",
    meta: "Heading · text-2xl / 600",
    cls: "font-heading text-2xl font-semibold tracking-tight",
  },
  { sample: "Section title", meta: "Title · text-lg / 500", cls: "text-lg font-medium" },
  {
    sample: "Body copy that explains a feature clearly and calmly.",
    meta: "Body · text-base / 400",
    cls: "text-base",
  },
  {
    sample: "Secondary supporting text.",
    meta: "Small · text-sm / muted",
    cls: "text-sm text-muted-foreground",
  },
  {
    sample: "getscenario/web · v1.0.0",
    meta: "Mono · font-mono text-xs",
    cls: "font-mono text-xs text-muted-foreground",
  },
] as const;

const radii = [
  { name: "rounded-md", rem: "0.68rem", cls: "rounded-md" },
  { name: "rounded-lg", rem: "0.85rem", cls: "rounded-lg" },
  { name: "rounded-xl", rem: "1.19rem", cls: "rounded-xl" },
  { name: "rounded-2xl", rem: "1.53rem", cls: "rounded-2xl" },
  { name: "rounded-3xl", rem: "1.87rem", cls: "rounded-3xl" },
] as const;

const spacings = [1, 2, 3, 4, 6, 8, 12] as const;

export default function DesignSystemPage() {
  const project = getProjects()[0];
  const avatars = getTeam().map((member) => member.avatarUrl);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Design System
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Tokens and components Scenario extracted from your connected app — a
            living reference for the surface your demos are filmed against.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 self-start">
          <Sparkles className="size-3.5" />
          Auto-extracted
        </Badge>
      </div>

      {/* Connected-app banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="glow-teal pointer-events-none absolute inset-x-0 top-0 h-24" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-xl text-white ring-1 ring-white/10"
              style={{
                backgroundImage: `radial-gradient(120% 140% at 12% 0%, color-mix(in oklch, ${project.thumbnailColor} 70%, transparent), transparent 60%), linear-gradient(160deg, #161b20, #0b0d10)`,
              }}
            >
              <Palette className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Extracted from your connected app
              </p>
              <p className="font-heading text-base font-medium">
                {project.name}
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <GithubIcon className="size-3.5" />
                {project.repo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{project.framework}</Badge>
            <Badge variant="secondary" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              In sync
            </Badge>
          </div>
        </div>
      </div>

      {/* Colors */}
      <DsSection
        title="Color & tokens"
        description="One near-black canvas, one electric-teal accent. Click any token to copy its value."
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-4 rounded-xl border border-primary/25 bg-primary/[0.06] p-4 sm:flex-row sm:items-center">
            <div className="h-16 w-full rounded-lg bg-primary shadow-[0_0_40px_-8px_var(--primary)] sm:w-44" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Primary — the single accent</p>
              <p className="text-xs text-muted-foreground">
                Every interactive highlight uses this electric teal. Everything
                else stays calm and neutral.
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 font-mono text-xs text-muted-foreground">
                <span>#2ee6cf</span>
                <span>oklch(0.83 0.14 183)</span>
              </div>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {paletteTokens.map((token) => (
              <ColorSwatch
                key={token.name}
                name={token.name}
                value={token.value}
                swatchClassName={token.swatchClassName}
              />
            ))}
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              Data-visualization palette
            </p>
            <div className="flex flex-wrap gap-2">
              {chartTokens.map((token) => (
                <div
                  key={token.name}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-1.5"
                >
                  <span
                    className={cn("size-4 rounded", token.swatchClassName)}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {token.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DsSection>

      {/* Typography */}
      <DsSection
        title="Typography"
        description="Geist for UI and headings, Geist Mono for code and metadata."
      >
        <div className="divide-y divide-border">
          {typeScale.map((row) => (
            <div
              key={row.meta}
              className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <span className={cn("min-w-0", row.cls)}>{row.sample}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                {row.meta}
              </span>
            </div>
          ))}
        </div>
      </DsSection>

      {/* Radius + spacing */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DsSection
          title="Radius"
          description="Derived from a single --radius: 0.85rem base."
        >
          <div className="flex flex-wrap items-end gap-4">
            {radii.map((r) => (
              <div key={r.name} className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "size-16 border border-primary/30 bg-primary/10",
                    r.cls,
                  )}
                />
                <div className="text-center">
                  <p className="font-mono text-[11px]">{r.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {r.rem}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DsSection>

        <DsSection
          title="Spacing"
          description="A 4px base unit keeps rhythm consistent."
        >
          <div className="space-y-2.5">
            {spacings.map((step) => (
              <div key={step} className="flex items-center gap-3">
                <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">
                  space-{step}
                </span>
                <span
                  className="h-3 rounded bg-primary"
                  style={{ width: step * 4 }}
                />
                <span className="font-mono text-[11px] text-muted-foreground">
                  {step * 4}px
                </span>
              </div>
            ))}
          </div>
        </DsSection>
      </div>

      {/* Components */}
      <DsSection
        title="Components"
        description="Live shadcn/ui (Base UI) primitives used across Scenario — not screenshots."
        bare
      >
        <ComponentGallery avatars={avatars} />
      </DsSection>
    </div>
  );
}
