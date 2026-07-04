import type { Metadata } from "next";
import { FolderGit2 } from "lucide-react";

import { PageStub } from "@/components/dashboard/page-stub";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <PageStub
      title="Projects"
      description="Connect a repo or live URL and manage the apps Scenario films."
      blurb="Project management is on its way. Soon you will connect apps, pick flows and trigger deterministic recordings from here."
      icon={FolderGit2}
    />
  );
}
