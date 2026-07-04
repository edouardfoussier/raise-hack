"use client";

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";

import { USE_CLERK } from "@/lib/env";

/**
 * Appearance for Clerk's hosted components so a real sign-in matches the app's
 * premium flame theme. Only applied when Clerk is actually mounted.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: "#ff5a1f",
    borderRadius: "0.85rem",
  },
} as const;

/**
 * Wraps the app in `next-themes` so light/dark is togglable and persisted.
 * Light is the DEFAULT — `.dark` is only applied when the user explicitly
 * opts in (persisted to localStorage). `next-themes` injects a tiny
 * pre-hydration script that reads the stored choice, so there is no FOUC.
 */
function ThemeShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}

/**
 * Mounts `<ClerkProvider>` only when real Clerk keys are configured and demo
 * mode is off. In demo mode (the default) it renders children directly, so the
 * app never touches Clerk and works with zero environment variables.
 */
export function Providers({ children }: { children: ReactNode }) {
  if (USE_CLERK) {
    return (
      <ClerkProvider appearance={clerkAppearance}>
        <ThemeShell>{children}</ThemeShell>
      </ClerkProvider>
    );
  }
  return <ThemeShell>{children}</ThemeShell>;
}
