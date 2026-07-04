import type { Metadata } from "next";
import Link from "next/link";
import { AudioLines, Captions, Clock, Eye } from "lucide-react";

import { Logo } from "@/components/logo";
import { VideoPoster } from "@/components/video-poster";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons";
import { getVideoByShareId, getProjectById } from "@/lib/mock-data";
import {
  formatCompactNumber,
  formatDate,
  formatDuration,
  formatNumber,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const video = getVideoByShareId(id);
  return {
    title: video ? video.title : "Shared demo",
    description: video
      ? `A deterministic demo generated with Scenario — ${video.title}.`
      : "A demo shared with Scenario.",
  };
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;
  const video = getVideoByShareId(id);
  const project = video ? getProjectById(video.projectId) : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo />
          </Link>
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ variant: "default" }), "h-9 gap-2")}
          >
            <GithubIcon className="size-4" />
            <span className="hidden sm:inline">Make your own demo</span>
            <span className="sm:hidden">Try it</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {video ? (
          <article className="space-y-6">
            <div className="group/poster relative">
              <VideoPoster
                color={video.thumbnailColor}
                durationSec={video.durationSec}
                processing={video.status !== "ready"}
                playSize="lg"
                className="aspect-video w-full rounded-2xl border border-border/70"
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">
                  {video.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {project ? `${project.name} · ` : ""}
                  Deterministic demo generated with Scenario
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
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
                    <Clock className="size-3.5" />
                    {formatDuration(video.durationSec)}
                  </Badge>
                </div>
              </div>

              {/* View-count badge from mock analytics */}
              <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                <Eye className="size-4 text-primary" />
                <span className="font-medium tabular-nums">
                  {formatNumber(video.analytics.views)}
                </span>
                <span className="text-muted-foreground">views</span>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Unique viewers</p>
                <p className="mt-0.5 font-medium tabular-nums">
                  {formatCompactNumber(video.analytics.uniqueIps)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Published</p>
                <p className="mt-0.5 font-medium">
                  {formatDate(video.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last viewed</p>
                <p className="mt-0.5 font-medium">
                  {video.analytics.lastViewedAt
                    ? formatDate(video.analytics.lastViewedAt)
                    : "—"}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-8 text-center">
              <p className="font-heading text-lg font-medium">
                Generate demos like this with Scenario
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                Deterministic, shareable demo videos of your web app — captions,
                voice-over and analytics included.
              </p>
              <Link
                href="/sign-in"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "mt-1 h-10 gap-2 px-5",
                )}
              >
                <GithubIcon className="size-4" />
                Sign in with GitHub
              </Link>
            </div>
          </article>
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
            <VideoPoster
              color="#2ee6cf"
              processing
              className="mb-6 aspect-video w-full max-w-md rounded-xl"
            />
            <h1 className="font-heading text-xl font-medium">
              This demo is still processing
            </h1>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              The share link{" "}
              <span className="font-mono text-foreground/80">/v/{id}</span> is
              not ready yet. Check back shortly.
            </p>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "secondary" }), "mt-6")}
            >
              Back to home
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
