import Link from "next/link";
import {
  AudioLines,
  Captions,
  Eye,
  GitCompareArrows,
  Palette,
  Play,
  Scan,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { HeroPreview } from "@/components/site/hero-preview";
import { GithubIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { getFeaturedShareId } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

/** The review flow — the product spine (Statement One). */
const steps = [
  {
    icon: Scan,
    title: "Extract the design system",
    body: "Diffender reads your live app and lifts its real design system — colors, type, spacing, motion and components — straight from the deployed UI.",
  },
  {
    icon: GitCompareArrows,
    title: "Review every change",
    body: "On each commit it renders the diff and reasons about it against those tokens, classifying the change: accidental regression, intentional redesign, or platform constraint.",
  },
  {
    icon: Wrench,
    title: "Reconcile the drift",
    body: "When a change drifts off-system, Diffender explains why — in your tokens, not pixels — and proposes the on-token fix, keeping designers and engineers aligned.",
  },
];

/** Design-system / drift features — the core product. */
const features = [
  {
    icon: Palette,
    title: "Live design system",
    body: "Your product's real tokens and components, extracted from the deployed app — a single source of truth for what “on-brand” means.",
  },
  {
    icon: ShieldCheck,
    title: "Drift detection",
    body: "Every commit is checked against the system. Hardcoded values, off-scale spacing and out-of-palette colors get flagged before they ship.",
  },
  {
    icon: Sparkles,
    title: "Reasoned classification",
    body: "Not a lint rule — a verdict with a confidence score that tells a regression apart from a deliberate redesign or a platform constraint.",
  },
  {
    icon: Wrench,
    title: "Proposed reconciliation",
    body: "For regressions, a ready-to-apply diff that reverts hardcoded values back to your design tokens.",
  },
  {
    icon: Users,
    title: "Designers + engineers aligned",
    body: "One shared language — the design system — so a change reads the same way to the person who drew it and the person who shipped it.",
  },
  {
    icon: GitCompareArrows,
    title: "Before / after, side by side",
    body: "See exactly what the change did to the rendered UI, with the reasoning attached to the commit that caused it.",
  },
];

/** Bonus — the demo-video mode, same engine. */
const demoFeatures = [
  {
    icon: Captions,
    title: "Auto captions",
    body: "Synced, on-brand subtitles from the narration — readable with the sound off.",
  },
  {
    icon: AudioLines,
    title: "AI voice-over",
    body: "A narrated walkthrough in a natural, optionally cloned voice.",
  },
  {
    icon: Eye,
    title: "Share analytics",
    body: "Track views and unique viewers on every public link.",
  },
];

const heroPrimaryCta = cn(
  buttonVariants({ variant: "default" }),
  "h-11 gap-2 rounded-xl px-6 text-sm font-medium",
);
const heroSecondaryCta = cn(
  buttonVariants({ variant: "secondary" }),
  "h-11 gap-2 rounded-xl px-6 text-sm font-medium",
);

export default function Home() {
  const featured = getFeaturedShareId();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero — Statement One */}
        <section className="relative overflow-hidden">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(80%_60%_at_50%_0%,black,transparent)]" />
          <div className="glow-accent pointer-events-none absolute inset-x-0 top-0 h-[420px]" />

          <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                <span className="inline-block size-1.5 rounded-full bg-primary" />
                An AI-native design system
              </span>

              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                Keep your product on-brand, every commit.
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
                Diffender reasons about consistency across your product&apos;s
                visual and interactive surface. It extracts your real design
                system, detects drift as it happens, proposes the reconciliation
                — and keeps designers and engineers speaking the same language.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/sign-in" className={heroPrimaryCta}>
                  <GithubIcon className="size-4" />
                  Sign in with GitHub
                </Link>
                <Link href="/dashboard/diff-render" className={heroSecondaryCta}>
                  <GitCompareArrows className="size-4" />
                  See a review
                </Link>
              </div>
            </div>

            <div className="relative mx-auto mt-16 max-w-4xl">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* How it works — the review flow */}
        <section
          id="how-it-works"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              From live app to reconciled design system
            </h2>
            <p className="mt-4 text-muted-foreground">
              Diffender extracts your design system, reviews every change against
              it, and proposes the fix when a commit drifts — reasoning in your
              tokens, not pixels.
            </p>
          </div>

          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="group relative rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-mono text-sm text-muted-foreground/70">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-heading text-lg font-medium">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features — design-system / drift */}
        <section
          id="features"
          className="border-y border-border/70 bg-card/30 scroll-mt-20"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">Features</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                A design system that reviews itself
              </h2>
              <p className="mt-4 text-muted-foreground">
                Detect drift, understand intent, and reconcile changes — all
                grounded in the tokens your product already ships.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-background/60 p-6 transition-colors hover:border-primary/40"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <feature.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-heading text-base font-medium">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bonus — demo videos, same engine */}
        <section
          id="demos"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                Bonus
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                And it films the demo, too
              </h2>
              <p className="mt-4 text-muted-foreground">
                The same engine that drives your app to review a change can drive
                it to record one. Describe a flow and Diffender films a
                deterministic walkthrough — captions, voice-over and a shareable
                link — straight from your real components.
              </p>

              <ul className="mt-6 space-y-3">
                {demoFeatures.map((feature) => (
                  <li key={feature.title} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                      <feature.icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{feature.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {feature.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <Link
                href={`/v/${featured}`}
                className={cn(heroSecondaryCta, "mt-8 inline-flex")}
              >
                <Play className="size-4 fill-current" />
                Watch a demo
              </Link>
            </div>

            <div className="min-w-0 flex-1">
              <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-xl shadow-black/20 ring-1 ring-white/5">
                <video
                  className="aspect-video w-full bg-[#0b0d10] object-cover"
                  src="/videos/deja-catalogue.mp4"
                  poster="/videos/deja-catalogue.jpg"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="A Diffender-generated onboarding demo"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center sm:px-12">
            <div className="glow-accent pointer-events-none absolute inset-x-0 top-0 h-40" />
            <h2 className="relative text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Ship fast without shipping drift.
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
              Connect your app and let Diffender guard your design system on
              every commit.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/sign-in" className={heroPrimaryCta}>
                <GithubIcon className="size-4" />
                Sign in with GitHub
              </Link>
              <Link href="/dashboard/diff-render" className={heroSecondaryCta}>
                <GitCompareArrows className="size-4" />
                See a review
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
