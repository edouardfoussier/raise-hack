"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { USE_CLERK } from "@/lib/env";
import { cn } from "@/lib/utils";

/** Best-effort clear of any client-side demo session hint before redirecting. */
function clearDemoSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("scenario.demo-session");
    window.sessionStorage.removeItem("scenario.demo-session");
  } catch {
    // Storage may be unavailable (private mode / SSR) — ignore.
  }
}

/**
 * Sign-out control for the dashboard.
 *
 * - Real Clerk session: delegates to Clerk's `SignOutButton`, redirecting home.
 * - Demo mode (no Clerk keys): clears the local demo session hint and navigates
 *   back to the marketing homepage so the flow feels real without a provider.
 *
 * Flame + theme-aware via the shared `Button` tokens.
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  const handleDemoSignOut = useCallback(() => {
    clearDemoSession();
    router.push("/");
    router.refresh();
  }, [router]);

  const content = (
    <>
      <LogOut className="size-4" />
      Log out
    </>
  );

  const buttonClassName = cn(
    "w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
    className,
  );

  if (USE_CLERK) {
    return (
      <SignOutButton redirectUrl="/">
        <Button variant="ghost" size="lg" className={buttonClassName}>
          {content}
        </Button>
      </SignOutButton>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      className={buttonClassName}
      onClick={handleDemoSignOut}
    >
      {content}
    </Button>
  );
}
