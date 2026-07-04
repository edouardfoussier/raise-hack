import "server-only";

import type { AppUser } from "./types";
import { USE_CLERK } from "./env";
import { DEMO_USER } from "./mock-data";

/**
 * Returns the current user as a normalized {@link AppUser}, or `null` when
 * signed out.
 *
 * - Demo mode (default, and whenever Clerk keys are absent): returns the
 *   deterministic {@link DEMO_USER} so protected pages render without a real
 *   auth provider.
 * - Real mode (Clerk keys present and demo mode off): resolves the signed-in
 *   user via Clerk's `currentUser()`.
 *
 * Clerk's server SDK is imported lazily so it is never evaluated in demo mode,
 * guaranteeing the app works with no environment variables set.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  if (!USE_CLERK) {
    return DEMO_USER;
  }

  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  if (!user) return null;

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.primaryEmailAddress?.emailAddress ||
    "User";

  return {
    id: user.id,
    name,
    email: user.primaryEmailAddress?.emailAddress ?? "",
    imageUrl: user.imageUrl,
    isDemo: false,
  };
}
