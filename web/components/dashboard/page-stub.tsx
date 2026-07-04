import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/**
 * Minimal placeholder for dashboard sections that other agents will build out.
 * Keeps navigation working with a consistent, premium "coming soon" surface.
 */
export function PageStub({
  title,
  description,
  blurb,
  icon: Icon,
}: {
  title: string;
  description: string;
  blurb: string;
  icon: LucideIcon;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="size-6" />
        </span>
        <h2 className="mt-5 font-heading text-lg font-medium">Coming soon</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{blurb}</p>
        <Badge variant="secondary" className="mt-5">
          In progress
        </Badge>
      </div>
    </div>
  );
}
