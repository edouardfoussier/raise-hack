import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { DEMO_USER } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

/**
 * Neutral workspace card. No plan tier is claimed — this is a demo account, so
 * we surface the Design Guardrails promise instead of an inflated "Pro plan".
 */
function WorkspaceCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-primary" />
        <p className="text-sm font-medium">Design Guardrails</p>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Every commit is checked against your design system — regressions get
        flagged before they ship.
      </p>
      <Link
        href="/dashboard/design-system"
        className={cn(
          buttonVariants({ variant: "secondary" }),
          "mt-3 h-8 w-full text-xs",
        )}
      >
        View projects
      </Link>
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = (await getCurrentUser()) ?? DEMO_USER;

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center px-5">
          <Link
            href="/"
            aria-label="Scenario home"
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <SidebarNav />
        </div>
        <div className="space-y-2 p-3">
          <WorkspaceCard />
          <LogoutButton />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-dvh flex-col md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl sm:px-8">
          <MobileNav />
          <Link href="/" aria-label="Scenario home" className="md:hidden">
            <Logo showWordmark={false} />
          </Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Badge variant="outline" className="hidden gap-1.5 sm:inline-flex">
              <ShieldCheck className="size-3.5 text-primary" />
              Design Guardrails
            </Badge>
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
