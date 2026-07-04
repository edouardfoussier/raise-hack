import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Consistent section shell for the Design System page: a heading + optional
 * aside, followed by a bordered content surface (opt out with `bare`).
 */
export function DsSection({
  title,
  description,
  aside,
  bare = false,
  contentClassName,
  children,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  bare?: boolean;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-medium">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {aside}
      </div>

      {bare ? (
        <div className={contentClassName}>{children}</div>
      ) : (
        <div
          className={cn(
            "rounded-2xl border border-border bg-card p-5 sm:p-6",
            contentClassName,
          )}
        >
          {children}
        </div>
      )}
    </section>
  );
}
