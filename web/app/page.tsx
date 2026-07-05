import Link from "next/link";
import {
  AudioLines,
  Captions,
  Eye,
  GitBranch,
  Play,
  Scissors,
  Share2,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { HeroPreview } from "@/components/site/hero-preview";
import { GithubIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { getFeaturedShareId } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: GitBranch,
    title: "Connect your app",
    body: "Point Diffender at your repo or a live URL. It drives your real components in a headless browser — no mockups, no rebuilds.",
  },
  {
    icon: Wand2,
    title: "Describe the flow — or let AI plan it",
    body: "Write the scenario to film, or let the AI planner map the user flow for you and ask for any inputs it needs.",
  },
  {
    icon: Share2,
    title: "Get a shareable video",
    body: "Diffender records a deterministic take with captions and voice-over, then hands you a polished, shareable link.",
  },
];

const features = [
  {
    icon: Captions,
    title: "Auto captions",
    body: "Synced, on-brand subtitles generated from the narration — readable with the sound off.",
  },
  {
    icon: AudioLines,
    title: "AI voice-over",
    body: "A narrated walkthrough in a natural, optionally cloned voice that matches your script.",
  },
  {
    icon: Scissors,
    title: "Intro & outro",
    body: "Branded bookends stitched onto every take, so each clip feels ready to publish.",
  },
  {
    icon: Eye,
    title: "Share analytics",
    body: "Track views and unique viewers on every public link, straight from your dashboard.",
  },
  {
    icon: Zap,
    title: "Deterministic replay",
    body: "The same input produces the same take every time — reliable enough for changelogs and CI.",
  },
  {
    icon: Sparkles,
    title: "From real components",
    body: "Films your actual UI in the browser, so the demo always matches what you shipped.",
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
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(80%_60%_at_50%_0%,black,transparent)]" />
          <div className="glow-accent pointer-events-none absolute inset-x-0 top-0 h-[420px]" />

          <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24">
            <div className="mx-auto max-w-3xl text-center">
              <Link
                href={`/v/${featured}`}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
              >
                <span className="inline-block size-1.5 rounded-full bg-primary" />
                Deterministic demo videos, from your real app
              </Link>

              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                Ship the demo, not just the code.
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
                Diffender auto-generates polished, deterministic demo videos of
                your web app — with captions, voice-over and a shareable link —
                straight from your real components.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/sign-in" className={heroPrimaryCta}>
                  <GithubIcon className="size-4" />
                  Sign in with GitHub
                </Link>
                <Link href={`/v/${featured}`} className={heroSecondaryCta}>
                  <Play className="size-4 fill-current" />
                  See a demo
                </Link>
              </div>
            </div>

            <div className="relative mx-auto mt-16 max-w-4xl">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              From repo to shareable demo in three steps
            </h2>
            <p className="mt-4 text-muted-foreground">
              Diffender plans the flow, drives your real UI, and produces a
              share-ready video — no manual screen recording.
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

        {/* Features */}
        <section
          id="features"
          className="border-y border-border/70 bg-card/30 scroll-mt-20"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">Features</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything a demo needs, generated for you
              </h2>
              <p className="mt-4 text-muted-foreground">
                Captions, voice-over, branded intro/outro and analytics — all
                produced from a single deterministic take.
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

        {/* CTA band */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center sm:px-12">
            <div className="glow-accent pointer-events-none absolute inset-x-0 top-0 h-40" />
            <h2 className="relative text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to ship the demo?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
              Sign in with GitHub and generate your first deterministic demo
              video in minutes.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/sign-in" className={heroPrimaryCta}>
                <GithubIcon className="size-4" />
                Sign in with GitHub
              </Link>
              <Link href={`/v/${featured}`} className={heroSecondaryCta}>
                <Play className="size-4 fill-current" />
                See a demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
