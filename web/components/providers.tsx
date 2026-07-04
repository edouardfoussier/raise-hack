import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

import { USE_CLERK } from "@/lib/env";

/**
 * Dark appearance for Clerk's hosted components so a real sign-in matches the
 * app's premium dark/teal theme. Only applied when Clerk is actually mounted.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: "#2ee6cf",
    colorBackground: "#14171a",
    colorText: "#eef2f1",
    colorTextSecondary: "#9aa4a8",
    colorInputBackground: "#1a1e21",
    colorInputText: "#eef2f1",
    colorNeutral: "#eef2f1",
    borderRadius: "0.85rem",
  },
} as const;

/**
 * Mounts `<ClerkProvider>` only when real Clerk keys are configured and demo
 * mode is off. In demo mode (the default) it renders children directly, so the
 * app never touches Clerk and works with zero environment variables.
 */
export function Providers({ children }: { children: ReactNode }) {
  if (USE_CLERK) {
    return <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>;
  }
  return <>{children}</>;
}
