"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, GitCommitHorizontal, Play } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";
import { getVideoByShareId } from "@/lib/mock-data";
import type { Commit } from "@/lib/reviews";
import { cn } from "@/lib/utils";

import { GuardrailsAlert, GuardrailsBadge } from "./guardrails-alert";

/** View-model for a video linked to a commit. */
export type LinkedVideo = {
  shareId: string;
  title: string;
};

/** Resolve a commit's linked video (title) from the mock-data store, if any. */
function linkedVideoFor(commit: Commit): LinkedVideo | undefined {
  if (!commit.videoShareId) return undefined;
  const video = getVideoByShareId(commit.videoShareId);
  if (!video) return undefined;
  return { shareId: video.shareId, title: video.title };
}

/**
 * Per-project commit history. Each row shows message + short hash + author +
 * date. Commits Design Guardrails watched carry a colored classification badge
 * and expand to the full agent-notification alert (before/after + fix). One
 * commit can also link a demo video.
 */
export function CommitTimeline({ commits }: { commits: Commit[] }) {
  // First reviewed commit starts expanded so the story is visible on load.
  const firstReviewed = commits.find((c) => c.review)?.hash ?? null;
  const [openHash, setOpenHash] = useState<string | null>(firstReviewed);

  return (
    <ol className="relative space-y-3">
      {commits.map((commit) => {
        const open = openHash === commit.hash;
        const hasReview = Boolean(commit.review);
        const linked = linkedVideoFor(commit);

        return (
          <li
            key={commit.hash}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <button
              type="button"
              onClick={() =>
                hasReview
                  ? setOpenHash(open ? null : commit.hash)
                  : undefined
              }
              aria-expanded={hasReview ? open : undefined}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                hasReview
                  ? "cursor-pointer hover:bg-muted/40"
                  : "cursor-default",
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <GitCommitHorizontal className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{commit.message}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                    {commit.hash}
                  </code>
                  <span>·</span>
                  <span>{commit.author}</span>
                  <span>·</span>
                  <span>{formatDate(commit.date)}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {linked ? (
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                    <Play className="size-3 fill-current" />
                    demo
                  </span>
                ) : null}
                {commit.review ? (
                  <GuardrailsBadge review={commit.review} />
                ) : null}
                {hasReview ? (
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      open && "rotate-180",
                    )}
                  />
                ) : null}
              </div>
            </button>

            {hasReview && open && commit.review ? (
              <div className="border-t border-border bg-muted/20 p-3 sm:p-4">
                <GuardrailsAlert review={commit.review} />

                {linked ? (
                  <>
                    <Separator className="my-4" />
                    <Link
                      href={`/v/${linked.shareId}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Play className="size-4 fill-current" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          Linked demo
                        </p>
                        <p className="truncate text-sm font-medium">
                          {linked.title}
                        </p>
                      </div>
                    </Link>
                  </>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
