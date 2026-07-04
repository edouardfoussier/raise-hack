"use client";

import type { ComponentProps } from "react";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Stripe checkout STUB. No real Stripe integration — clicking always fires a
 * "coming soon" toast so the billing flow is demoable without keys.
 */
export function StripeCheckoutButton({
  label,
  description = "You'll be redirected to Stripe's secure checkout.",
  variant = "default",
  className,
  ...props
}: {
  label: string;
  description?: string;
} & Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  return (
    <Button
      variant={variant}
      className={className}
      onClick={() =>
        toast("Stripe checkout — coming soon", { description })
      }
      {...props}
    >
      <CreditCard className="size-4" />
      {label}
    </Button>
  );
}
