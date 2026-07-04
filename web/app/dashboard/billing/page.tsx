import type { Metadata } from "next";
import { CreditCard } from "lucide-react";

import { PageStub } from "@/components/dashboard/page-stub";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <PageStub
      title="Billing"
      description="Manage your plan, usage and invoices."
      blurb="Billing is coming soon — review usage, change plans and download invoices without leaving the dashboard."
      icon={CreditCard}
    />
  );
}
