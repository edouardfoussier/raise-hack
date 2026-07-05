"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PROJECT_COOKIE, type SwitcherProject } from "@/lib/projects";
import { cn } from "@/lib/utils";

/**
 * Vercel-style project switcher for the top navbar. Sits to the right of the
 * sidebar logo. Selecting a project writes the scoping cookie and refreshes so
 * server components (Diff Render, and anything else that reads the cookie)
 * re-render scoped to the chosen project.
 */
export function ProjectSwitcher({
  projects,
  currentId,
}: {
  projects: SwitcherProject[];
  currentId: string;
}) {
  const router = useRouter();
  const current =
    projects.find((p) => p.id === currentId) ?? projects[0];

  function select(id: string) {
    if (id === current?.id) return;
    // 1 year, root path so every dashboard route sees the scope.
    document.cookie = `${PROJECT_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  if (!current) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <span
          className="size-4 shrink-0 rounded-[5px] ring-1 ring-black/10 dark:ring-white/10"
          style={{ backgroundColor: current.color }}
          aria-hidden
        />
        <span className="max-w-[10rem] truncate">{current.name}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-64">
        <DropdownMenuLabel>Projects</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((project) => {
          const active = project.id === current.id;
          return (
            <DropdownMenuItem
              key={project.id}
              onClick={() => select(project.id)}
              className="gap-2.5"
            >
              <span
                className="size-4 shrink-0 rounded-[5px] ring-1 ring-black/10 dark:ring-white/10"
                style={{ backgroundColor: project.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
              {active ? (
                <Check className="size-4 shrink-0 text-primary" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
