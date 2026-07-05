import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DsProjects } from "@/components/design-system/ds-projects";
import { getDsProjects } from "@/lib/design-systems";

export const metadata: Metadata = { title: "Design Systems" };

export default function DesignSystemsPage() {
  const projects = getDsProjects();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Design Systems
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The design system of each of your apps — colors, type, spacing,
            motion and components, extracted straight from the live site. Pick a
            project to explore its system and ask what fits.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 self-start">
          <Sparkles className="size-3.5" />
          Extracted from your live apps
        </Badge>
      </div>

      <DsProjects seedProjects={projects} />
    </div>
  );
}
