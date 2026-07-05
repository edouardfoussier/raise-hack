"use client";

import { useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  Loader2,
  MessageSquare,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import type { DesignSystem } from "@/lib/design-systems";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** One tokens/component reference the model matched to the intent. */
interface Match {
  /** Display name of the token/component, e.g. "primary" or "badge 1". */
  token: string;
  /** Which group it belongs to (color / typography / component / …). */
  group: string;
  /** Short reason this token satisfies or conflicts with the intent. */
  reason: string;
}

interface ChatAnswer {
  /** 1-2 sentence overall reasoning grounded in the extracted system. */
  rationale: string;
  satisfies: Match[];
  conflicts: Match[];
}

interface Turn {
  intent: string;
  answer?: ChatAnswer;
  error?: string;
  loading: boolean;
}

const EXAMPLES = [
  "a primary CTA for a destructive action",
  "a subtle secondary button that recedes",
  "a success badge for a completed state",
];

function MatchCard({ match, tone }: { match: Match; tone: "ok" | "warn" }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        tone === "ok"
          ? "border-primary/25 bg-primary/[0.05]"
          : "border-destructive/25 bg-destructive/[0.05]",
      )}
    >
      <div className="flex items-center gap-2">
        {tone === "ok" ? (
          <Check className="size-3.5 shrink-0 text-primary" />
        ) : (
          <TriangleAlert className="size-3.5 shrink-0 text-destructive" />
        )}
        <span className="truncate text-sm font-medium capitalize">
          {match.token}
        </span>
        <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground capitalize">
          {match.group}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{match.reason}</p>
    </div>
  );
}

export function DesignChat({ ds }: { ds: DesignSystem }) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const busy = turns.some((t) => t.loading);

  async function ask(intent: string) {
    const trimmed = intent.trim();
    if (!trimmed || busy) return;
    setInput("");
    const index = turns.length;
    setTurns((prev) => [...prev, { intent: trimmed, loading: true }]);
    // Scroll to bottom on next paint.
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
    );

    try {
      const res = await fetch("/api/design-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: trimmed, projectId: ds.projectId }),
      });
      const data = (await res.json()) as
        | { answer: ChatAnswer }
        | { error: string };
      setTurns((prev) => {
        const next = [...prev];
        if ("answer" in data) {
          next[index] = { intent: trimmed, answer: data.answer, loading: false };
        } else {
          next[index] = { intent: trimmed, error: data.error, loading: false };
        }
        return next;
      });
    } catch {
      setTurns((prev) => {
        const next = [...prev];
        next[index] = {
          intent: trimmed,
          error: "Couldn't reach the design engine.",
          loading: false,
        };
        return next;
      });
    } finally {
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
      );
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border/70 px-4 py-3.5">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <MessageSquare className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-sm font-medium">Design intent</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Ask what fits — grounded in {ds.siteName}&apos;s tokens
          </p>
        </div>
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-5 overflow-y-auto px-4 py-4"
      >
        {turns.length === 0 ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-background/40 p-3.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Describe an intent and I&apos;ll reason over{" "}
                {ds.siteName}&apos;s extracted design system — which existing
                tokens <span className="text-foreground">satisfy</span> it, and
                which would <span className="text-foreground">conflict</span>.
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Try
              </p>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => ask(ex)}
                  className="block w-full truncate rounded-lg border border-border bg-background/40 px-3 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn, i) => (
            <div key={i} className="space-y-3">
              {/* User intent bubble */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                  {turn.intent}
                </div>
              </div>

              {turn.loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Reasoning over the system…
                </div>
              ) : turn.error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  {turn.error}
                </div>
              ) : turn.answer ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground/90">
                    {turn.answer.rationale}
                  </p>

                  {turn.answer.satisfies.length ? (
                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
                        <Check className="size-3" />
                        Satisfies the intent
                      </p>
                      {turn.answer.satisfies.map((m, j) => (
                        <MatchCard key={j} match={m} tone="ok" />
                      ))}
                    </div>
                  ) : null}

                  {turn.answer.conflicts.length ? (
                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive">
                        <TriangleAlert className="size-3" />
                        Conflicts / would drift
                      </p>
                      {turn.answer.conflicts.map((m, j) => (
                        <MatchCard key={j} match={m} tone="warn" />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="border-t border-border/70 p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={1}
            placeholder="Describe a design intent…"
            className="max-h-28 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon-sm"
            disabled={busy || !input.trim()}
            aria-label="Send"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ArrowUp className="size-3.5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
