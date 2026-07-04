"use client";

import { Check, Lock } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { StripeCheckoutButton } from "./stripe-checkout-button";
import type { PlanConfig } from "./plans";

export function PlanCard({
  plan,
  isCurrent,
}: {
  plan: PlanConfig;
  isCurrent: boolean;
}) {
  const { recommended } = plan;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6",
        recommended
          ? "border-primary/40 ring-1 ring-primary/20"
          : "border-border",
      )}
    >
      {recommended ? (
        <div
          aria-hidden="true"
          className="glow-accent pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60"
        />
      ) : null}

      <div className="relative flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-medium">{plan.name}</h2>
        {isCurrent ? (
          <Badge>Current plan</Badge>
        ) : recommended ? (
          <Badge variant="secondary">Recommended</Badge>
        ) : null}
      </div>

      <p className="relative mt-1 text-sm text-muted-foreground">
        {plan.tagline}
      </p>

      <div className="relative mt-4 flex items-baseline gap-1">
        <span className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
          {plan.price}
        </span>
        <span className="text-sm text-muted-foreground">{plan.period}</span>
      </div>

      <Separator className="my-5" />

      <ul className="space-y-3">
        {plan.features.map((feature) => (
          <li
            key={feature.label}
            className={cn(
              "flex items-start gap-2.5 text-sm",
              !feature.included && "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "mt-px grid size-5 shrink-0 place-items-center rounded-full",
                feature.included
                  ? feature.highlight
                    ? "bg-primary text-primary-foreground"
                    : "text-primary"
                  : "text-muted-foreground/50",
              )}
            >
              {feature.included ? (
                <Check className="size-3.5" />
              ) : (
                <Lock className="size-3" />
              )}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-2",
                feature.highlight && feature.included && "font-medium text-foreground",
              )}
            >
              {feature.label}
              {feature.highlight ? (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-primary uppercase ring-1 ring-primary/20">
                  Pro
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        {isCurrent ? (
          <Button variant="outline" className="w-full gap-1.5" disabled>
            <Check className="size-4" />
            Current plan
          </Button>
        ) : plan.id === "pro" ? (
          <StripeCheckoutButton
            label="Upgrade to Pro"
            description="You'll be redirected to Stripe's secure checkout."
            className="w-full gap-1.5"
          />
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              toast("Downgrade — coming soon", {
                description: "Your Pro features stay active until period end.",
              })
            }
          >
            Switch to Free
          </Button>
        )}
      </div>
    </div>
  );
}
