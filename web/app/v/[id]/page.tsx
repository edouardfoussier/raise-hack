import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioLines, Captions, Clock, Eye, Radio } from "lucide-react";

import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons";
import { SharePlayer } from "@/components/share/share-player";
import { ShareCTA } from "@/components/share/share-cta";
import { CopyLinkButton } from "@/components/share/copy-link-button";
import { getProjectById, getVideoById, getVideoByShareId } from "@/lib/mock-data";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

function resolveVideo(id: string) {
  return getVideoByShareId(id) ?? getVideoById(id);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const video = resolveVideo(id);

  if (!video) {
    return {
      title: "Demo not found",
      description: "This Scenario demo link is unavailable.",
      robots: { index: false, follow: false },
    };
  }

  const project = getProjectById(video.projectId);
  const description = `${
    project ? `${project.name} — ` : ""
  }A deterministic ${formatDuration(
    video.durationSec,
  )} product demo generated with Scenario.`;
  const ogTitle = `${video.title} · Scenario`;

  return {
    title: video.title,
    description,
    alternates: { canonical: `/v/${id}` },
    openGraph: {
      title: ogTitle,
      description,
      type: "video.other",
      url: `/v/${id}`,
      siteName: "Scenario",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;
  const video = resolveVideo(id);

  if (!video) {
    notFound();
  }

  const project = getProjectById(video.projectId);
  const ready = video.status === "ready";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Minimal public chrome — no dashboard sidebar. */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <CopyLinkButton />
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ variant: "default" }),
                "h-9 gap-2 px-4",
              )}
            >
              <GithubIcon className="size-4" />
              <span className="hidden sm:inline">Make your own demo</span>
              <span className="sm:hidden">Try it</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative flex-1">
        <div className="glow-teal pointer-events-none absolute inset-x-0 top-0 h-64" />
        <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.25] [mask-image:radial-gradient(80%_60%_at_50%_0%,black,transparent)]" />

        <article className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          <SharePlayer
            color={video.thumbnailColor}
            durationSec={video.durationSec}
            title={video.title}
            processing={!ready}
          />

          <div className="mt-6 flex flex-col gap-5 sm:mt-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <h1 className="text-balance font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                {video.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                {project ? (
                  <span className="font-medium text-foreground/80">
                    {project.name}
                  </span>
                ) : null}
                <span aria-hidden>·</span>
                <span>Deterministic demo</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {formatDuration(video.durationSec)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {ready ? (
                  <>
                    {video.hasCaptions ? (
                      <Badge variant="secondary" className="gap-1.5">
                        <Captions className="size-3.5" />
                        Captions
                      </Badge>
                    ) : null}
                    {video.hasVoiceover ? (
                      <Badge variant="secondary" className="gap-1.5">
                        <AudioLines className="size-3.5" />
                        Voice-over
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="gap-1.5">
                      <span className="inline-block size-1.5 rounded-full bg-primary" />
                      Ready to share
                    </Badge>
                  </>
                ) : (
                  <Badge variant="secondary" className="gap-1.5">
                    <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
                    Processing
                  </Badge>
                )}
              </div>
            </div>

            {/* View-count badge from mock analytics. */}
            <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border bg-card px-3.5 py-2 text-sm">
              <Eye className="size-4 text-primary" />
              <span className="font-medium tabular-nums">
                {formatNumber(video.analytics.views)}
              </span>
              <span className="text-muted-foreground">views</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-medium tabular-nums">
                {formatNumber(video.analytics.uniqueIps)}
              </span>
              <span className="text-muted-foreground">unique</span>
            </div>
          </div>

          {/* Analytics strip. */}
          <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-border bg-border/60 sm:grid-cols-3">
            <MetaCell
              icon={Eye}
              label="Total views"
              value={formatNumber(video.analytics.views)}
            />
            <MetaCell
              icon={Radio}
              label="Unique viewers"
              value={formatNumber(video.analytics.uniqueIps)}
            />
            <MetaCell
              icon={Clock}
              label="Last viewed"
              value={
                video.analytics.lastViewedAt
                  ? formatDate(video.analytics.lastViewedAt)
                  : "Not viewed yet"
              }
            />
          </dl>

          <p className="mt-3 text-xs text-muted-foreground">
            Published {formatDate(video.createdAt)}
            {project ? ` · ${project.repo}` : ""}
          </p>

          <div className="mt-10 sm:mt-12">
            <ShareCTA />
          </div>
        </article>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Scenario. All rights reserved.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Made with Scenario
          </Link>
        </div>
      </footer>
    </div>
  );
}

function MetaCell({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card p-4">
      <dt className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="mt-1 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
