"use client";

import { useState } from "react";
import {
  Check,
  CircleCheck,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  classificationLabel,
  type Review,
  type ReviewClassification,
} from "@/lib/reviews";
import { cn } from "@/lib/utils";

/** Per-classification color + icon system. Regression=red, redesign=green, platform=amber. */
const STYLES: Record<
  ReviewClassification,
  {
    ring: string;
    iconWrap: string;
    chip: string;
    accent: string;
    Icon: typeof ShieldAlert;
    verb: string;
  }
> = {
  accidental_regression: {
    ring: "border-destructive/40",
    iconWrap: "bg-destructive/10 text-destructive ring-1 ring-destructive/20",
    chip: "bg-destructive/10 text-destructive ring-1 ring-destructive/20",
    accent: "text-destructive",
    Icon: ShieldAlert,
    verb: "flagged a regression",
  },
  intentional_redesign: {
    ring: "border-emerald-500/40",
    iconWrap:
      "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400",
    chip: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400",
    accent: "text-emerald-600 dark:text-emerald-400",
    Icon: Sparkles,
    verb: "cleared an intentional redesign",
  },
  platform_constraint: {
    ring: "border-amber-500/40",
    iconWrap:
      "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400",
    chip: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400",
    accent: "text-amber-600 dark:text-amber-400",
    Icon: ShieldCheck,
    verb: "allowed a platform constraint",
  },
};

function BeforeAfter({ review }: { review: Review }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(
        [
          { label: "Before", src: review.beforePng },
          { label: "After", src: review.afterPng },
        ] as const
      ).map(({ label, src }) => (
        <figure key={label} className="space-y-1.5">
          <figcaption className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </figcaption>
          <div className="grid place-items-center rounded-xl border border-border bg-background/60 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${label} — ${review.id}`}
              className="max-h-24 w-auto object-contain"
            />
          </div>
        </figure>
      ))}
    </div>
  );
}

/** Minimal unified-diff renderer: colors +/- lines. */
function DiffBlock({ diff, title }: { diff: string; title: string }) {
  const lines = diff.split("\n");
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background/60">
      <div className="border-b border-border/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        {title}
      </div>
      <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed">
        <code className="font-mono">
          {lines.map((line, i) => {
            const isAdd = line.startsWith("+") && !line.startsWith("+++");
            const isDel = line.startsWith("-") && !line.startsWith("---");
            const isMeta =
              line.startsWith("@@") ||
              line.startsWith("diff ") ||
              line.startsWith("+++") ||
              line.startsWith("---");
            return (
              <div
                key={i}
                className={cn(
                  "whitespace-pre",
                  isAdd &&
                    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                  isDel && "bg-destructive/10 text-destructive",
                  isMeta && "text-muted-foreground/70",
                )}
              >
                {line || " "}
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

/**
 * Design Guardrails alert for a single commit — the agent-notification card.
 * Renders the pre-generated verdict (no live VLM): classification chip +
 * confidence, reasoning, before/after screenshots, the committed diff, and (for
 * regressions) the proposed on-token fix with a working "Fix it" button that
 * simulates applying the patch. No real git op runs.
 */
export function GuardrailsAlert({ review }: { review: Review }) {
  const style = STYLES[review.classification];
  const { Icon } = style;
  const isRegression = review.classification === "accidental_regression";
  const confidencePct = Math.round(review.confidence * 100);

  const [fixState, setFixState] = useState<"idle" | "fixing" | "fixed">("idle");

  function handleFix() {
    if (fixState !== "idle") return;
    setFixState("fixing");
    // Simulate applying the on-token patch — no real git op.
    window.setTimeout(() => setFixState("fixed"), 1500);
  }

  return (
    <div className={cn("rounded-2xl border bg-card p-4 sm:p-5", style.ring)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            style.iconWrap,
          )}
        >
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1 text-sm font-semibold">
              <span aria-hidden>🛡️</span> Design Guardrails
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                style.chip,
              )}
            >
              {classificationLabel(review.classification)}
              <span className="opacity-70">· {confidencePct}%</span>
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reviewed this commit against your design system — {style.verb}.
          </p>
        </div>
      </div>

      {/* Reasoning */}
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        {review.reasoning}
      </p>

      {/* Before / after */}
      <div className="mt-4">
        <BeforeAfter review={review} />
      </div>

      {/* Committed diff */}
      <div className="mt-4">
        <DiffBlock diff={review.diff} title="What changed in this commit" />
      </div>

      {/* Proposed fix + Fix it (regressions only) */}
      {isRegression && review.proposedDiff ? (
        <div className="mt-4 space-y-3">
          <DiffBlock
            diff={review.proposedDiff}
            title="Proposed fix — back on tokens"
          />
          <div className="flex items-center gap-3">
            {fixState === "fixed" ? (
              <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                <CircleCheck className="size-4" />
                Fix applied — back on tokens
              </span>
            ) : (
              <Button
                onClick={handleFix}
                disabled={fixState === "fixing"}
                className="gap-1.5"
              >
                {fixState === "fixing" ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Applying fix…
                  </>
                ) : (
                  <>
                    <Wrench className="size-4" />
                    Fix it
                  </>
                )}
              </Button>
            )}
            {fixState === "idle" ? (
              <span className="text-xs text-muted-foreground">
                Reverts the hardcoded values to design tokens.
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
            style.chip,
          )}
        >
          <Check className="size-3.5" />
          No fix needed — this change stays on the design system.
        </div>
      )}
    </div>
  );
}

/** Compact one-liner used in the collapsed timeline row. */
export function GuardrailsBadge({ review }: { review: Review }) {
  const style = STYLES[review.classification];
  const confidencePct = Math.round(review.confidence * 100);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        style.chip,
      )}
    >
      <span aria-hidden>🛡️</span>
      {classificationLabel(review.classification)}
      <span className="opacity-70">· {confidencePct}%</span>
    </span>
  );
}
