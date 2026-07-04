"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Invoice = {
  id: string;
  date: string;
  amount: string;
};

const INVOICES: Invoice[] = [
  { id: "INV-2026-006", date: "Jul 1, 2026", amount: "$29.00" },
  { id: "INV-2026-005", date: "Jun 1, 2026", amount: "$29.00" },
  { id: "INV-2026-004", date: "May 1, 2026", amount: "$29.00" },
];

export function InvoiceList() {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="font-heading text-base font-medium">Invoices</h2>
          <p className="text-xs text-muted-foreground">
            Your last few billing receipts.
          </p>
        </div>
      </div>
      <ul className="divide-y divide-border/70 border-t border-border/70">
        {INVOICES.map((invoice) => (
          <li
            key={invoice.id}
            className="flex items-center gap-3 px-5 py-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{invoice.id}</p>
              <p className="text-xs text-muted-foreground">{invoice.date}</p>
            </div>
            <span className="tabular-nums text-muted-foreground">
              {invoice.amount}
            </span>
            <Badge variant="secondary">Paid</Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Download ${invoice.id}`}
              onClick={() =>
                toast("Invoice download — coming soon", {
                  description: `${invoice.id} · ${invoice.amount}`,
                })
              }
            >
              <Download className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
