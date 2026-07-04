import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { getFeaturedShareId } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function ShareNotFound() {
  const featured = getFeaturedShareId();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Link
            href="/"
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </Link>
        </div>
      </header>

      <main className="relative grid flex-1 place-items-center px-4 py-16">
        <div className="glow-accent pointer-events-none absolute inset-x-0 top-0 h-64" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.2] [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]" />

        <div className="relative flex max-w-md flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Play className="size-6 translate-x-0.5 fill-current" />
          </span>
          <p className="mt-6 font-mono text-xs text-muted-foreground/70">
            404 · Demo not found
          </p>
          <h1 className="mt-2 text-balance font-heading text-2xl font-semibold tracking-tight">
            This share link isn&apos;t available
          </h1>
          <p className="mt-3 text-pretty text-sm text-muted-foreground">
            The demo you&apos;re looking for may have been unpublished or the link
            was mistyped. Explore Scenario or watch a live example instead.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "default" }),
                "h-10 gap-2 rounded-xl px-5",
              )}
            >
              Back to Scenario
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={`/v/${featured}`}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "h-10 gap-2 rounded-xl px-5",
              )}
            >
              <Play className="size-4 fill-current" />
              See a demo
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
