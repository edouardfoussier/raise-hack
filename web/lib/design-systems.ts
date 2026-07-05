/**
 * Design-system layer for the Scenario "Statement One" surface.
 *
 * Each connected project has a design system EXTRACTED FROM ITS LIVE APP by
 * dembrandt (`npx dembrandt <url> --save-output`). The raw extractor JSON is a
 * sprawling, defensive shape (nulls everywhere, rgb() strings, px+rem blends);
 * this module normalizes it once into a clean, renderable `DesignSystem` that
 * the UI and the design-intent chat both consume.
 *
 * Pre-extracted JSONs live in `lib/design-systems/*.json`. Live extraction
 * (`POST /api/extract`) produces the same raw shape, so it flows through the
 * exact same `normalizeDesignSystem` path.
 */

import thesphinxRaw from "./design-systems/thesphinx.json";
import wattaneRaw from "./design-systems/wattane.json";
import archipelRaw from "./design-systems/archipel.json";

/* -------------------------------------------------------------------------- */
/*  Normalized, view-model shapes (the stable contract the UI renders).       */
/* -------------------------------------------------------------------------- */

export type TokenKind =
  | "color"
  | "typography"
  | "spacing"
  | "radius"
  | "shadow"
  | "motion"
  | "breakpoint"
  | "component";

export interface ColorToken {
  id: string;
  /** Semantic / role label, e.g. "primary", "background", or a usage hint. */
  name: string;
  /** Normalized hex (#rrggbb) for the swatch fill. */
  hex: string;
  /** Original extracted value (rgb()/oklch()/lab()), kept for fidelity. */
  raw: string;
  /** How often the color appeared — a rough weight for prominence. */
  count?: number;
  confidence?: string;
  role?: string;
}

export interface TypeToken {
  id: string;
  /** Extractor context: display / heading-2 / body / caption / ui / link … */
  context: string;
  family: string;
  /** e.g. "40px (2.50rem)". */
  size: string;
  weight: number | string;
  lineHeight?: string | null;
  letterSpacing?: string | null;
  transform?: string | null;
}

export interface SpacingToken {
  id: string;
  px: number;
  label: string;
  rem?: string;
  count?: number;
}

export interface RadiusToken {
  id: string;
  label: string;
  px: number;
  count?: number;
  elements?: string[];
}

export interface ShadowToken {
  id: string;
  value: string;
  count?: number;
}

export interface MotionToken {
  id: string;
  kind: "duration" | "easing";
  value: string;
  count?: number;
}

export interface BreakpointToken {
  id: string;
  label: string;
  px: number;
}

export interface ComponentState {
  backgroundColor?: string;
  color?: string;
  padding?: string;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
  fontSize?: string;
  fontWeight?: string | number;
  textDecoration?: string;
}

export interface ComponentToken {
  id: string;
  /** buttons | links | badges | inputs. */
  group: string;
  /** A short human label (text content or role). */
  label: string;
  /** The resting-state style, flattened for preview. */
  style: ComponentState;
  confidence?: string;
}

export interface DesignSystem {
  /** Slug that matches the owning project id. */
  projectId: string;
  siteName: string;
  url: string;
  extractedAt: string;
  extractorVersion?: string;
  frameworks: string[];
  colors: ColorToken[];
  typography: TypeToken[];
  spacing: SpacingToken[];
  radii: RadiusToken[];
  shadows: ShadowToken[];
  motion: MotionToken[];
  breakpoints: BreakpointToken[];
  components: ComponentToken[];
}

/* -------------------------------------------------------------------------- */
/*  Color normalization — dembrandt emits rgb()/rgba()/oklch()/lab() and a    */
/*  pre-normalized hex on most entries; prefer the hex, fall back to a parse. */
/* -------------------------------------------------------------------------- */

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHex(value: string, fallbackHex?: string): string {
  if (fallbackHex && /^#[0-9a-fA-F]{3,8}$/.test(fallbackHex)) {
    return fallbackHex.length === 4
      ? `#${fallbackHex[1]}${fallbackHex[1]}${fallbackHex[2]}${fallbackHex[2]}${fallbackHex[3]}${fallbackHex[3]}`
      : fallbackHex.slice(0, 7);
  }
  const rgb = value.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const parts = rgb[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) {
      const [r, g, b] = parts;
      return `#${clamp255(r).toString(16).padStart(2, "0")}${clamp255(g)
        .toString(16)
        .padStart(2, "0")}${clamp255(b).toString(16).padStart(2, "0")}`;
    }
  }
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value.slice(0, 7);
  // oklch()/lab() without a hex twin — render as neutral so the swatch still shows.
  return "#94a3b8";
}

function pxOf(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const m = String(value).match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

/* -------------------------------------------------------------------------- */
/*  The normalizer. Accepts the raw dembrandt JSON (loosely typed) and yields  */
/*  a clean DesignSystem. Every field is defensive: extracts can be thin.      */
/* -------------------------------------------------------------------------- */

// The raw shape is huge and irregular; we type it as a loose record and guard.
type Raw = Record<string, unknown>;

function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function asObj(v: unknown): Raw {
  return v && typeof v === "object" ? (v as Raw) : {};
}

export function normalizeDesignSystem(raw: Raw, projectId: string): DesignSystem {
  const colorsRaw = asObj(raw.colors);
  const semantic = asObj(colorsRaw.semantic);
  const detected = asArray<Raw>(colorsRaw.detected);
  const palette = asArray<Raw>(colorsRaw.palette);

  // Semantic roles first (background / text / primary…), then the detected
  // palette, de-duplicated by hex so swatches stay meaningful.
  const colors: ColorToken[] = [];
  const seen = new Set<string>();
  for (const [role, val] of Object.entries(semantic)) {
    const raw = String(val);
    const hex = toHex(raw);
    if (seen.has(hex)) continue;
    seen.add(hex);
    colors.push({ id: `color-sem-${role}`, name: role, hex, raw, role });
  }
  const pool = detected.length ? detected : palette;
  for (const c of pool) {
    const rawv = String(c.color ?? c.normalized ?? "");
    const hex = toHex(rawv, typeof c.normalized === "string" ? c.normalized : undefined);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    colors.push({
      id: `color-${hex.slice(1)}`,
      name: (typeof c.role === "string" && c.role) || hex,
      hex,
      raw: rawv || hex,
      count: typeof c.count === "number" ? c.count : undefined,
      confidence: typeof c.confidence === "string" ? c.confidence : undefined,
      role: typeof c.role === "string" ? c.role : undefined,
    });
  }

  const typographyRaw = asObj(raw.typography);
  const typography: TypeToken[] = asArray<Raw>(typographyRaw.styles).map((s, i) => ({
    id: `type-${i}`,
    context: String(s.context ?? "text"),
    family: String(s.family ?? "—"),
    size: String(s.size ?? ""),
    weight: (s.weight as number | string) ?? 400,
    lineHeight: (s.lineHeight as string | null) ?? null,
    letterSpacing: (s.spacing as string | null) ?? null,
    transform: (s.transform as string | null) ?? null,
  }));

  const spacingRaw = asObj(raw.spacing);
  const spacing: SpacingToken[] = asArray<Raw>(spacingRaw.commonValues)
    .map((s, i) => ({
      id: `space-${i}`,
      px: typeof s.numericValue === "number" ? s.numericValue : pxOf(s.px as string),
      label: String(s.display ?? s.px ?? ""),
      rem: typeof s.rem === "string" ? s.rem : undefined,
      count: typeof s.count === "number" ? s.count : undefined,
    }))
    .filter((s) => s.px > 0);

  const radiusRaw = asObj(raw.borderRadius);
  const radii: RadiusToken[] = asArray<Raw>(radiusRaw.values).map((r, i) => ({
    id: `radius-${i}`,
    label: String(r.value ?? ""),
    px: typeof r.numericValue === "number" ? r.numericValue : pxOf(r.value as string),
    count: typeof r.count === "number" ? r.count : undefined,
    elements: asArray<string>(r.elements),
  }));

  const shadows: ShadowToken[] = asArray<unknown>(raw.shadows).map((s, i) => ({
    id: `shadow-${i}`,
    value: typeof s === "string" ? s : String(asObj(s).value ?? ""),
    count: typeof asObj(s).count === "number" ? (asObj(s).count as number) : undefined,
  }));

  const motionRaw = asObj(raw.motion);
  const motion: MotionToken[] = [
    ...asArray<Raw>(motionRaw.durations).map((d, i) => ({
      id: `motion-dur-${i}`,
      kind: "duration" as const,
      value: String(d.value ?? ""),
      count: typeof d.count === "number" ? d.count : undefined,
    })),
    ...asArray<Raw>(motionRaw.easings).map((e, i) => ({
      id: `motion-ease-${i}`,
      kind: "easing" as const,
      value: String(e.value ?? ""),
      count: typeof e.count === "number" ? e.count : undefined,
    })),
  ].filter((m) => m.value);

  const breakpoints: BreakpointToken[] = asArray<Raw>(raw.breakpoints).map((b, i) => ({
    id: `bp-${i}`,
    label: String(b.px ?? ""),
    px: pxOf(b.px as string),
  }));

  const componentsRaw = asObj(raw.components);
  const components: ComponentToken[] = [];
  for (const group of ["buttons", "links", "badges"] as const) {
    const list = asArray<Raw>(componentsRaw[group]);
    list.forEach((c, i) => {
      const states = asObj(c.states);
      const def = asObj(states.default);
      // Links sometimes carry style at the top level rather than under states.
      const style: ComponentState = {
        backgroundColor: (def.backgroundColor ?? c.backgroundColor) as string | undefined,
        color: (def.color ?? c.color) as string | undefined,
        padding: def.padding as string | undefined,
        borderRadius: def.borderRadius as string | undefined,
        border: def.border as string | undefined,
        boxShadow: def.boxShadow as string | undefined,
        fontSize: (def.fontSize ?? c.fontSize) as string | undefined,
        fontWeight: (def.fontWeight ?? c.fontWeight) as string | number | undefined,
        textDecoration: (def.textDecoration ?? c.textDecoration) as string | undefined,
      };
      const label =
        (typeof c.text === "string" && c.text.trim()) ||
        `${group.replace(/s$/, "")} ${i + 1}`;
      components.push({
        id: `comp-${group}-${i}`,
        group,
        label,
        style,
        confidence: typeof c.confidence === "string" ? c.confidence : undefined,
      });
    });
  }

  return {
    projectId,
    siteName: String(raw.siteName ?? projectId),
    url: String(raw.url ?? ""),
    extractedAt: String(raw.extractedAt ?? ""),
    extractorVersion: asObj(raw.meta).dembrandtVersion as string | undefined,
    frameworks: asArray<Raw>(raw.frameworks)
      .map((f) => String(f.name ?? ""))
      .filter(Boolean),
    colors,
    typography,
    spacing,
    radii,
    shadows,
    motion,
    breakpoints,
    components,
  };
}

/* -------------------------------------------------------------------------- */
/*  Project seed — the user's REAL projects. Three have live extractions;      */
/*  Déjà-bu is the video-demo target whose DS is extraction-pending (its SSO   */
/*  bypass blocks dembrandt), so we keep it honest rather than faking tokens.  */
/* -------------------------------------------------------------------------- */

export interface DsProject {
  id: string;
  name: string;
  url: string;
  thumbnailColor: string;
  description: string;
  /** "extracted" — has a real design system. "pending" — demo target only. */
  status: "extracted" | "pending";
  /** Present only when status === "extracted". */
  ds?: DesignSystem;
  /** Human note explaining a thin or pending extraction. */
  note?: string;
}

const thesphinx = normalizeDesignSystem(thesphinxRaw as Raw, "prj_thesphinx");
const wattane = normalizeDesignSystem(wattaneRaw as Raw, "prj_wattane");
const archipel = normalizeDesignSystem(archipelRaw as Raw, "prj_archipel");

const seedProjects: DsProject[] = [
  {
    id: "prj_thesphinx",
    name: "The Sphinx",
    url: "https://thesphinx.ai",
    thumbnailColor: "#a38c75",
    description:
      "An AI arena — riddles, duels and solo play. A rich, warm, editorial design system with a gold accent on near-black.",
    status: "extracted",
    ds: thesphinx,
  },
  {
    id: "prj_wattane",
    name: "Wattane",
    url: "https://www.wattane.com",
    thumbnailColor: "#94a3b8",
    description:
      "A bold, high-contrast marketing site — oversized Anton display type on deep navy, slate-blue accents.",
    status: "extracted",
    ds: wattane,
  },
  {
    id: "prj_archipel",
    name: "Archipel",
    url: "https://archipel-azure.vercel.app",
    thumbnailColor: "#eab308",
    description:
      "A canvas-based app. The extraction is thin by nature — most of the UI is drawn to <canvas>, so few DOM tokens surface.",
    status: "extracted",
    ds: archipel,
    note: "Thin extraction — Archipel renders most of its UI to a canvas, so dembrandt sees very few DOM-level tokens.",
  },
  {
    id: "prj_deja_bu",
    name: "Déjà Bu",
    url: "https://deja-bu.demo.getscenar.io",
    thumbnailColor: "#6366f1",
    description:
      "The inventory-reception app filmed in the Scenario demo video. Its dev deployment sits behind an SSO bypass that dembrandt can't pass.",
    status: "pending",
    note: "Extraction pending — Déjà Bu's preview is gated by an SSO-bypass header dembrandt can't send. It's the demo-video target, not a design-system source.",
  },
];

export function getDsProjects(): DsProject[] {
  return seedProjects.slice();
}

export function getDsProjectById(id: string): DsProject | undefined {
  return seedProjects.find((p) => p.id === id);
}

/** Count of renderable tokens across all groups — used for the project card stat. */
export function tokenCount(ds: DesignSystem): number {
  return (
    ds.colors.length +
    ds.typography.length +
    ds.spacing.length +
    ds.radii.length +
    ds.shadows.length +
    ds.motion.length +
    ds.breakpoints.length +
    ds.components.length
  );
}
