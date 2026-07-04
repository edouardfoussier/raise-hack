import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Film, Globe } from "lucide-react";

import { GenerateDemoButton } from "@/components/dashboard/generate-demo-button";
import { VideoCard } from "@/components/videos/video-card";
import { GithubIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getProjectById, getVideos } from "@/lib/mock-data";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

/** Strip the protocol so `https://app.getscenar.io` renders as `app.getscenar.io`. */
function prettyUrl(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return `${host}${pathname === "/" ? "" : pathname}`;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = getProjectById(id);
  return { title: project ? project.name : "Project" };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const project = getProjectById(id);
  if (!project) notFound();

  const videos = getVideos()
    .filter((v) => v.projectId === project.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/projects"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "-ml-2.5 h-8 gap-1.5 px-2.5 text-muted-foreground",
        )}
      >
        <ArrowLeft className="size-4" />
        Projects
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div
          className="relative h-28"
          style={{
            backgroundImage: `radial-gradient(120% 140% at 12% 0%, color-mix(in oklch, ${project.thumbnailColor} 68%, transparent), transparent 60%), linear-gradient(160deg, #161b20, #0b0d10)`,
          }}
        >
          <div className="bg-grid absolute inset-0 opacity-30" />
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">
                  {project.name}
                </h1>
                <Badge variant="secondary">{project.framework}</Badge>
              </div>
              <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <GithubIcon className="size-4 shrink-0" />
                <span className="truncate">{project.repo}</span>
              </p>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {project.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
                <a
                  href={project.appUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Globe className="size-3.5" />
                  {prettyUrl(project.appUrl)}
                  <ArrowUpRight className="size-3.5 opacity-70" />
                </a>
                <span className="inline-flex items-center gap-1.5">
                  <Film className="size-3.5" />
                  {videos.length} {videos.length === 1 ? "video" : "videos"}
                </span>
                <span>Deployed {formatRelativeTime(project.lastDeployedAt)}</span>
              </div>
            </div>

            <GenerateDemoButton
              projectId={project.id}
              className="h-10 shrink-0 px-4"
            />
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-medium">Demos</h2>
        {videos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                projectName={project.name}
              />
            ))}
          </div>
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Film className="size-5" />
            </span>
            <p className="mt-4 font-heading text-base font-medium">
              No demos yet
            </p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Generate your first deterministic demo for this project.
            </p>
            <GenerateDemoButton
              projectId={project.id}
              className="mt-5 h-9 px-4"
            />
          </div>
        )}
      </section>
    </div>
  );
}
