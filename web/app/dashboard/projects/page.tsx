import type { Metadata } from "next";

import { ProjectCard } from "@/components/projects/project-card";
import { ConnectRepoButton } from "@/components/projects/connect-repo-button";
import { getProjects, getVideos } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  const projects = getProjects();
  const videos = getVideos();

  const videoCountFor = (projectId: string) =>
    videos.filter((v) => v.projectId === projectId).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Projects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connected repos and apps Scenario films. Generate a deterministic
            demo from any project.
          </p>
        </div>
        <ConnectRepoButton />
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
    </div>
  );
}
