import type { Metadata } from "next";
import { Film, HardDrive, Sparkles, Users } from "lucide-react";

import { InvoiceList } from "@/components/billing/invoice-list";
import { PlanCard } from "@/components/billing/plan-card";
import { PLANS } from "@/components/billing/plans";
import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { getBilling } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  const billing = getBilling();
  const isPro = billing.plan === "pro";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Billing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your plan, usage and invoices.
        </p>
      </div>

      {/* Current plan summary + Stripe stub */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Sparkles className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-heading text-base font-medium capitalize">
                {billing.plan} plan
              </p>
              <Badge>Current plan</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isPro
                ? "$29/mo · renews Aug 1, 2026"
                : "Free forever · upgrade anytime"}
            </p>
          </div>
        </div>
        <StripeCheckoutButton
          label="Manage billing"
          description="Update your payment method and download invoices on Stripe."
          variant="outline"
          className="gap-1.5 sm:w-auto"
        />
      </div>

      {/* Plan comparison */}
      <div className="grid gap-6 md:grid-cols-2">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.id === billing.plan}
          />
        ))}
      </div>

      {/* Usage */}
      <section className="space-y-4">
        <h2 className="font-heading text-lg font-medium">Usage this month</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Videos"
            value={12}
            icon={Film}
            hint="of unlimited"
          />
          <StatCard
            label="Storage"
            value="4.2 GB"
            icon={HardDrive}
            hint="of 100 GB"
          />
          <StatCard label="Team seats" value="3" icon={Users} hint="of 10" />
        </div>
      </section>

      <InvoiceList />
    </div>
  );
}
