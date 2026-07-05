/**
 * Design Guardrails — pre-generated review data.
 *
 * The verdicts here were produced offline by the Drift review agent (a VLM that
 * diffs each commit's rendered UI against the project's design system) and
 * cached to `.drift-cache/reviews/`. The web app RENDERS these verdicts — it
 * never calls a VLM at runtime. The before/after PNGs live in
 * `public/reviews/` and are the real screenshots the agent compared.
 *
 * Shape mirrors `.drift-cache/reviews/manifest.json` plus the commit metadata
 * needed to render a per-project commit timeline.
 */

export type ReviewClassification =
  | "accidental_regression"
  | "intentional_redesign"
  | "platform_constraint";

/** A Design Guardrails verdict attached to a commit. */
export interface Review {
  id: string;
  classification: ReviewClassification;
  /** 0..1 model confidence. */
  confidence: number;
  /** Plain-English explanation; names the tokens involved. */
  reasoning: string;
  /**
   * Suggested on-token fix as a unified diff. Present for regressions; empty
   * string when there is nothing to fix (intentional / platform-constraint).
   */
  proposedDiff: string;
  /** The diff that was actually committed (what triggered the review). */
  diff: string;
  /** Screenshot paths under /public. */
  beforePng: string;
  afterPng: string;
}

/** A commit in a project's history. May carry a Design Guardrails review. */
export interface Commit {
  hash: string;
  message: string;
  author: string;
  /** ISO-8601 timestamp. */
  date: string;
  /** Present when Design Guardrails watched this commit. */
  review?: Review;
  /** Optional linked demo video (a shareId from mock-data videos). */
  videoShareId?: string;
}

const REVIEWS_BASE = "/reviews";

/**
 * The four real Design Guardrails verdicts (cached from the review agent),
 * keyed by review id. Text mirrors `public/reviews/manifest.json`.
 */
const REVIEWS: Record<string, Review> = {
  "01-padding-color-regression": {
    id: "01-padding-color-regression",
    classification: "accidental_regression",
    confidence: 0.97,
    reasoning:
      "Two token violations: padding was changed from var(--space-md) var(--space-lg) (12px 16px) to a hardcoded '14px 16px', putting the vertical padding off the spacing scale entirely (no step equals 14px). Background was changed from var(--color-brand) (#4F46E5) to a hardcoded #3B82F6, which is not in the palette at all — it's a generic blue that doesn't match brand or brand-hover. Both changes hardcode values that must come from tokens, breaking themeability and visually shifting the button's identity color.",
    proposedDiff:
      "--- a/sample-app/components.css\n+++ b/sample-app/components.css\n@@ -6,7 +6,7 @@\n   font-family: var(--font-family);\n   font-size: var(--font-size-md);\n   font-weight: var(--font-weight-medium);\n-  padding: 14px 16px;\n+  padding: var(--space-md) var(--space-lg); /* 12px 16px — on the spacing scale */\n   border-radius: var(--radius-md);\n   border: 1px solid transparent;\n   line-height: 1.2;\n@@ -18,7 +18,7 @@\n \n .btn--primary {\n-  background: #3B82F6;\n+  background: var(--color-brand);\n   color: var(--color-on-brand);\n }\n .btn--primary:hover {",
    diff: "diff --git a/sample-app/components.css b/sample-app/components.css\n@@ -6,7 +6,7 @@\n-  padding: var(--space-md) var(--space-lg);\n+  padding: 14px 16px;\n@@ -18,7 +18,7 @@\n .btn--primary {\n-  background: var(--color-brand);\n+  background: #3B82F6;",
    beforePng: `${REVIEWS_BASE}/01-padding-color-regression-before.png`,
    afterPng: `${REVIEWS_BASE}/01-padding-color-regression-after.png`,
  },
  "02-motion-regression": {
    id: "02-motion-regression",
    classification: "accidental_regression",
    confidence: 0.97,
    reasoning:
      "The transition was changed from the token-based `background/transform/box-shadow var(--motion-fast) var(--ease-standard)` (120ms, cubic-bezier(0.2,0,0,1)) to a hardcoded `all 450ms linear`. This is off-scale on duration (450ms matches neither motion.fast=120ms nor motion.slow=240ms), uses a raw 'linear' easing instead of the token ease-standard, and switches to 'all' which risks animating unintended layout-affecting properties. A clear regression from tokenized motion to magic numbers.",
    proposedDiff:
      "- transition: all 450ms linear;\n+ transition:\n+   background var(--motion-fast) var(--ease-standard),\n+   transform var(--motion-fast) var(--ease-standard),\n+   box-shadow var(--motion-fast) var(--ease-standard);",
    diff: "diff --git a/sample-app/components.css b/sample-app/components.css\n@@ -11,10 +11,7 @@\n-  transition:\n-    background var(--motion-fast) var(--ease-standard),\n-    transform var(--motion-fast) var(--ease-standard),\n-    box-shadow var(--motion-fast) var(--ease-standard);\n+  transition: all 450ms linear;",
    beforePng: `${REVIEWS_BASE}/02-motion-regression-before.png`,
    afterPng: `${REVIEWS_BASE}/02-motion-regression-after.png`,
  },
  "03-intentional-redesign": {
    id: "03-intentional-redesign",
    classification: "intentional_redesign",
    confidence: 0.78,
    reasoning:
      "Every value in the diff still resolves to a token: padding moves from --space-md/--space-lg (12px 16px) to --space-lg/--space-xl (16px 24px), and border-radius moves from --radius-md (10px) to --radius-pill (999px). No magic numbers or off-scale hex/px values were introduced — this is a coherent, deliberate stylistic shift to a pill-shaped CTA using the existing spacing and radius scale rungs, not a drift off the system.",
    proposedDiff: "",
    diff: "diff --git a/sample-app/components.css b/sample-app/components.css\n@@ -6,8 +6,8 @@\n-  padding: var(--space-md) var(--space-lg); /* 12px 16px */\n-  border-radius: var(--radius-md);\n+  padding: var(--space-lg) var(--space-xl); /* 16px 24px — up one rung */\n+  border-radius: var(--radius-pill);",
    beforePng: `${REVIEWS_BASE}/03-intentional-redesign-before.png`,
    afterPng: `${REVIEWS_BASE}/03-intentional-redesign-after.png`,
  },
  "04-platform-tap-target": {
    id: "04-platform-tap-target",
    classification: "platform_constraint",
    confidence: 0.78,
    reasoning:
      "Adding min-height: 44px and touch-action: manipulation doesn't reference any token, but it's not drift — it's enforcing WCAG 2.5.5 and iOS HIG minimum tap-target accessibility requirements, which are external platform constraints rather than a design-token concern. The visual rendering is essentially unchanged (the button already met 44px via its padding scale), so no token value was overridden. This is an additive, defensive constraint layered on top of the token-driven padding/radius/motion.",
    proposedDiff: "",
    diff: "diff --git a/sample-app/components.css b/sample-app/components.css\n@@ -10,6 +10,8 @@\n   border-radius: var(--radius-md);\n   line-height: 1.2;\n+  min-height: 44px; /* WCAG 2.5.5 / iOS HIG min tap target */\n+  touch-action: manipulation; /* remove 300ms tap delay on touch */\n   cursor: pointer;",
    beforePng: `${REVIEWS_BASE}/04-platform-tap-target-before.png`,
    afterPng: `${REVIEWS_BASE}/04-platform-tap-target-after.png`,
  },
};

/**
 * Per-project commit history. The demo project "Diffender Web" carries the four
 * watched commits (interleaved with a couple of plain commits for realism) so
 * clicking it opens a real Design Guardrails timeline. Other projects have a
 * short plain history.
 */
/** The four watched commits, newest first — shared across demo surfaces. */
const WATCHED_COMMITS: Commit[] = [
  {
    hash: "a3f9c21",
    message: "tweak CTA button padding + color for a punchier hero",
    author: "Demo User",
    date: "2026-07-04T16:12:00.000Z",
    review: REVIEWS["01-padding-color-regression"],
    videoShareId: "scenario-submission",
  },
  {
    hash: "7b1e4d8",
    message: "slow down button hover so it feels smoother",
    author: "Demo User",
    date: "2026-07-04T14:48:00.000Z",
    review: REVIEWS["02-motion-regression"],
  },
  {
    hash: "9d4c007",
    message: "copy: rename 'Sign up' CTA to 'Get started'",
    author: "Demo User",
    date: "2026-07-04T11:30:00.000Z",
  },
  {
    hash: "c52a0f6",
    message: "make the hero CTA a larger pill — steps to the next scale rungs",
    author: "Demo User",
    date: "2026-07-03T18:05:00.000Z",
    review: REVIEWS["03-intentional-redesign"],
  },
  {
    hash: "e0d7b93",
    message: "meet 44px WCAG/iOS tap target + kill 300ms tap delay on touch",
    author: "Demo User",
    date: "2026-07-03T10:22:00.000Z",
    review: REVIEWS["04-platform-tap-target"],
  },
  {
    hash: "1f0a6b2",
    message: "chore: bump deps and tidy README",
    author: "Demo User",
    date: "2026-07-02T09:14:00.000Z",
  },
];

const COMMITS_BY_PROJECT: Record<string, Commit[]> = {
  // Legacy project id (shown on /dashboard/projects).
  prj_scenario_web: WATCHED_COMMITS,
  // ---- The switcher's design-system projects. Diff Render is scoped by these.
  // The Sphinx carries the full four-verdict story — the demo centerpiece.
  prj_thesphinx: WATCHED_COMMITS,
  // Wattane: the two accidental regressions interleaved with plain commits.
  prj_wattane: [
    WATCHED_COMMITS[0], // padding/color regression (linked demo)
    WATCHED_COMMITS[2], // plain: rename CTA
    WATCHED_COMMITS[1], // motion regression
    WATCHED_COMMITS[5], // plain: chore
  ],
  // Archipel: an intentional redesign Guardrails correctly cleared.
  prj_archipel: [
    WATCHED_COMMITS[2], // plain: rename CTA
    WATCHED_COMMITS[3], // intentional redesign
    WATCHED_COMMITS[5], // plain: chore
  ],
  // Déjà Bu: the platform-constraint verdict on a mobile tap target.
  prj_deja_bu: [
    WATCHED_COMMITS[4], // platform constraint (44px tap target)
    WATCHED_COMMITS[5], // plain: chore
  ],
};

/** Commit history for a project, newest first. Empty when none is seeded. */
export function getCommitsForProject(projectId: string): Commit[] {
  return (COMMITS_BY_PROJECT[projectId] ?? []).slice();
}

/** Whether a project has any Design Guardrails activity to show. */
export function projectHasGuardrails(projectId: string): boolean {
  return getCommitsForProject(projectId).some((c) => c.review);
}

/** Count of accidental regressions flagged for a project. */
export function regressionCountForProject(projectId: string): number {
  return getCommitsForProject(projectId).filter(
    (c) => c.review?.classification === "accidental_regression",
  ).length;
}

/** Human-readable label for a classification. */
export function classificationLabel(c: ReviewClassification): string {
  switch (c) {
    case "accidental_regression":
      return "Accidental regression";
    case "intentional_redesign":
      return "Intentional redesign";
    case "platform_constraint":
      return "Platform constraint";
  }
}
