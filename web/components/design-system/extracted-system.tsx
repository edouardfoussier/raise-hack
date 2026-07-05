"use client";

import { useMemo } from "react";
import { X } from "lucide-react";

import type {
  ColorToken,
  ComponentToken,
  DesignSystem,
} from "@/lib/design-systems";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Small shared primitives                                                   */
/* -------------------------------------------------------------------------- */

/** A deletable chip wrapper — shows an X on hover in the top-right corner. */
function Deletable({
  onDelete,
  label,
  children,
  className,
}: {
  onDelete?: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("group/token relative", className)}>
      {children}
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${label}`}
          title={`Remove ${label}`}
          className="absolute -top-1.5 -right-1.5 z-10 grid size-5 place-items-center rounded-full border border-border bg-background text-muted-foreground opacity-0 shadow-sm transition-all hover:border-destructive/50 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/token:opacity-100"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

function Section({
  title,
  count,
  description,
  children,
}: {
  title: string;
  count?: number;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-lg font-medium">
            {title}
            {typeof count === "number" ? (
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-normal text-muted-foreground">
                {count}
              </span>
            ) : null}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Color                                                                     */
/* -------------------------------------------------------------------------- */

function readableOn(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#000";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Perceived luminance.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.92)";
}

function ColorCard({
  token,
  onDelete,
}: {
  token: ColorToken;
  onDelete?: () => void;
}) {
  return (
    <Deletable onDelete={onDelete} label={token.name}>
      <div className="overflow-hidden rounded-xl border border-border bg-background/40 transition-colors hover:border-primary/40">
        <div
          className="flex h-16 items-end justify-between p-2"
          style={{ backgroundColor: token.hex, color: readableOn(token.hex) }}
        >
          {token.role ? (
            <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-medium capitalize backdrop-blur-sm">
              {token.role}
            </span>
          ) : (
            <span />
          )}
          {token.confidence ? (
            <span className="text-[10px] opacity-70">{token.confidence}</span>
          ) : null}
        </div>
        <div className="space-y-0.5 p-2.5">
          <p className="truncate text-xs font-medium capitalize">{token.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {token.hex}
          </p>
        </div>
      </div>
    </Deletable>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component preview — renders the extracted resting-state styles verbatim.   */
/* -------------------------------------------------------------------------- */

function ComponentPreview({
  token,
  onDelete,
}: {
  token: ComponentToken;
  onDelete?: () => void;
}) {
  const s = token.style;
  const isLink = token.group === "links";
  const previewStyle: React.CSSProperties = {
    backgroundColor: s.backgroundColor,
    color: s.color,
    padding: s.padding,
    borderRadius: s.borderRadius,
    border: s.border,
    boxShadow: s.boxShadow,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight as React.CSSProperties["fontWeight"],
    textDecoration: s.textDecoration,
    display: "inline-flex",
    alignItems: "center",
    lineHeight: 1.2,
  };
  return (
    <Deletable onDelete={onDelete} label={token.label}>
      <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-background/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground capitalize">
            {token.group.replace(/s$/, "")}
          </span>
          {token.confidence ? (
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {token.confidence}
            </span>
          ) : null}
        </div>
        {/* Neutral stage so light/dark component chrome both read. */}
        <div className="grid flex-1 place-items-center rounded-lg bg-[repeating-conic-gradient(from_0deg,var(--muted)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] p-6">
          {isLink ? (
            <a style={previewStyle} onClick={(e) => e.preventDefault()} href="#">
              {token.label}
            </a>
          ) : (
            <span style={previewStyle}>{token.label}</span>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
          {s.borderRadius ? (
            <div className="col-span-2 flex justify-between gap-2">
              <dt>radius</dt>
              <dd className="truncate">{s.borderRadius}</dd>
            </div>
          ) : null}
          {s.padding ? (
            <div className="col-span-2 flex justify-between gap-2">
              <dt>padding</dt>
              <dd className="truncate">{s.padding}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </Deletable>
  );
}

/* -------------------------------------------------------------------------- */
/*  The full system renderer                                                  */
/* -------------------------------------------------------------------------- */

export function ExtractedSystem({
  ds,
  onDelete,
}: {
  ds: DesignSystem;
  /** Called with a token id to remove it. Omit to render read-only. */
  onDelete?: (tokenId: string) => void;
}) {
  const del = (id: string) => (onDelete ? () => onDelete(id) : undefined);

  // Sphinx alone yields 60 near-duplicate type styles; collapse to one per
  // (context+size+family) so the scale reads as a scale, not a dump.
  const typography = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof ds.typography = [];
    for (const t of ds.typography) {
      const key = `${t.context}|${t.size}|${t.family}|${t.weight}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
    return out.slice(0, 14);
  }, [ds.typography]);

  const spacing = useMemo(
    () => [...ds.spacing].sort((a, b) => a.px - b.px).slice(0, 12),
    [ds.spacing],
  );
  const radii = useMemo(
    () => [...ds.radii].sort((a, b) => a.px - b.px),
    [ds.radii],
  );
  const durations = ds.motion.filter((m) => m.kind === "duration");
  const easings = ds.motion.filter((m) => m.kind === "easing");

  return (
    <div className="space-y-10">
      {/* Colors */}
      {ds.colors.length ? (
        <Section
          title="Color"
          count={ds.colors.length}
          description="Semantic roles and the most-used colors detected across the live site."
        >
          <Panel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {ds.colors.map((c) => (
                <ColorCard key={c.id} token={c} onDelete={del(c.id)} />
              ))}
            </div>
          </Panel>
        </Section>
      ) : null}

      {/* Typography */}
      {typography.length ? (
        <Section
          title="Typography"
          count={ds.typography.length}
          description="The type scale, by role, exactly as it renders on the live site."
        >
          <Panel>
            <div className="divide-y divide-border">
              {typography.map((t) => (
                <Deletable
                  key={t.id}
                  onDelete={del(t.id)}
                  label={`${t.context} type`}
                  className="py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                    <span
                      className="min-w-0 truncate"
                      style={{
                        fontFamily: t.family,
                        fontWeight: t.weight as number,
                        textTransform:
                          (t.transform as React.CSSProperties["textTransform"]) ??
                          undefined,
                        letterSpacing: t.letterSpacing ?? undefined,
                        fontSize: `clamp(1rem, ${Math.min(
                          parseFloat(t.size) || 16,
                          44,
                        )}px, 2.75rem)`,
                      }}
                    >
                      {t.context}
                    </span>
                    <span className="flex shrink-0 flex-wrap items-baseline gap-x-3 font-mono text-[11px] text-muted-foreground">
                      <span className="text-foreground/70">{t.family}</span>
                      <span>{t.size}</span>
                      <span>· {t.weight}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 capitalize">
                        {t.context}
                      </span>
                    </span>
                  </div>
                </Deletable>
              ))}
            </div>
          </Panel>
        </Section>
      ) : null}

      {/* Spacing + Radius side by side */}
      {(spacing.length || radii.length) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {spacing.length ? (
            <Section
              title="Spacing"
              count={ds.spacing.length}
              description={`Detected scale · base ${
                (ds.spacing[0]?.rem && "≈") || ""
              }8px`}
            >
              <Panel>
                <div className="space-y-2.5">
                  {spacing.map((s) => (
                    <Deletable key={s.id} onDelete={del(s.id)} label={s.label}>
                      <div className="flex items-center gap-3">
                        <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">
                          {s.label}
                        </span>
                        <span
                          className="h-3 rounded bg-primary"
                          style={{ width: Math.min(s.px, 160) }}
                        />
                        {s.count ? (
                          <span className="font-mono text-[10px] text-muted-foreground/60">
                            ×{s.count}
                          </span>
                        ) : null}
                      </div>
                    </Deletable>
                  ))}
                </div>
              </Panel>
            </Section>
          ) : null}

          {radii.length ? (
            <Section
              title="Radius"
              count={ds.radii.length}
              description="Corner radii observed across buttons, cards and inputs."
            >
              <Panel>
                <div className="flex flex-wrap items-end gap-4">
                  {radii.map((r) => (
                    <Deletable key={r.id} onDelete={del(r.id)} label={r.label}>
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className="size-14 border border-primary/40 bg-primary/10"
                          style={{
                            borderRadius: Math.min(r.px, 28),
                          }}
                        />
                        <p className="font-mono text-[11px]">{r.label}</p>
                      </div>
                    </Deletable>
                  ))}
                </div>
              </Panel>
            </Section>
          ) : null}
        </div>
      )}

      {/* Motion + Breakpoints */}
      {(ds.motion.length || ds.breakpoints.length) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {ds.motion.length ? (
            <Section
              title="Motion"
              count={ds.motion.length}
              description="Transition durations and easing curves in use."
            >
              <Panel>
                <div className="space-y-4">
                  {durations.length ? (
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Durations
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {durations.map((m) => (
                          <Deletable key={m.id} onDelete={del(m.id)} label={m.value}>
                            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-1.5 font-mono text-[11px]">
                              {m.value}
                              {m.count ? (
                                <span className="text-muted-foreground/60">
                                  ×{m.count}
                                </span>
                              ) : null}
                            </span>
                          </Deletable>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {easings.length ? (
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">Easing</p>
                      <div className="flex flex-wrap gap-2">
                        {easings.map((m) => (
                          <Deletable key={m.id} onDelete={del(m.id)} label={m.value}>
                            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-1.5 font-mono text-[11px]">
                              {m.value}
                            </span>
                          </Deletable>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </Panel>
            </Section>
          ) : null}

          {ds.breakpoints.length ? (
            <Section
              title="Breakpoints"
              count={ds.breakpoints.length}
              description="Responsive cut points detected in the stylesheet."
            >
              <Panel>
                <div className="space-y-2.5">
                  {[...ds.breakpoints]
                    .sort((a, b) => a.px - b.px)
                    .map((b) => (
                      <Deletable key={b.id} onDelete={del(b.id)} label={b.label}>
                        <div className="flex items-center gap-3">
                          <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">
                            {b.label}
                          </span>
                          <span
                            className="h-2 rounded-full bg-gradient-to-r from-primary/60 to-primary"
                            style={{
                              width: `${Math.min((b.px / 1440) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </Deletable>
                    ))}
                </div>
              </Panel>
            </Section>
          ) : null}
        </div>
      )}

      {/* Components */}
      {ds.components.length ? (
        <Section
          title="Components"
          count={ds.components.length}
          description="Interactive primitives, rebuilt from their extracted resting-state styles — not screenshots."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ds.components.map((c) => (
              <ComponentPreview key={c.id} token={c} onDelete={del(c.id)} />
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
