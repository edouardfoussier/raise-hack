import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LogoMark } from "@/components/logo";
import { GithubIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Growth call-to-action shown at the bottom of every public share page.
 * The card itself links back to the marketing home ("/").
 */
export function ShareCTA() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10">
      <div className="glow-accent pointer-events-none absolute inset-x-0 top-0 h-40" />
      <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <LogoMark className="size-4 rounded-md [&>svg]:size-2.5" />
            Made with Diffender
          </span>
          <h2 className="text-balance font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Ship the demo, not just the code.
          </h2>
          <p className="text-pretty text-sm text-muted-foreground">
            Diffender turns your real web app into polished, deterministic demo
            videos — captions, voice-over and share analytics included.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "default" }),
              "h-11 gap-2 rounded-xl px-6 text-sm font-medium",
            )}
          >
            Explore Diffender
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-9 gap-2 px-3 text-xs text-muted-foreground",
            )}
          >
            <GithubIcon className="size-3.5" />
            Make your own demo
          </Link>
        </div>
      </div>
    </section>
  );
}
