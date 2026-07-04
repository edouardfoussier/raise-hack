import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Eye, Film, FolderGit2 } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { VideoCard } from "@/components/dashboard/video-card";
import { ProjectCard } from "@/components/dashboard/project-card";
import { GenerateDemoButton } from "@/components/dashboard/generate-demo-button";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import {
  DEMO_USER,
  getDashboardStats,
  getProjectById,
  getProjects,
  getVideos,
} from "@/lib/mock-data";
import { formatCompactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Overview",
};

export default async function DashboardOverview() {
  const user = (await getCurrentUser()) ?? DEMO_USER;
  const stats = getDashboardStats();
  const projects = getProjects();
  const videos = getVideos().sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const recent = videos.slice(0, 3);
  const firstName = user.name.split(" ")[0];

  const videoCountFor = (projectId: string) =>
    videos.filter((v) => v.projectId === projectId).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {firstName}. A snapshot of your demos and share
            activity.
          </p>
        </div>
        <GenerateDemoButton className="h-10 px-4" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={stats.projectCount}
          icon={FolderGit2}
          hint="Connected apps"
        />
        <StatCard
          label="Videos"
          value={stats.videoCount}
          icon={Film}
          hint={`${stats.readyCount} ready to share`}
        />
        <StatCard
          label="Total views"
          value={formatCompactNumber(stats.totalViews)}
          icon={Eye}
          hint="Across all share links"
        />
        <StatCard
          label="Ready to share"
          value={stats.readyCount}
          icon={CheckCircle2}
          hint="Published demos"
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-medium">Recent videos</h2>
          <Link
            href="/dashboard/videos"
            className={cn(buttonVariants({ variant: "ghost" }), "h-8")}
          >
            View all
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              projectName={getProjectById(video.projectId)?.name}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-medium">Your projects</h2>
          <Link
            href="/dashboard/projects"
            className={cn(buttonVariants({ variant: "ghost" }), "h-8")}
          >
            View all
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              videoCount={videoCountFor(project.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
