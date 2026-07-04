/**
 * Central feature flags for auth / demo mode.
 *
 * These read `NEXT_PUBLIC_*` variables so the same values are available on the
 * server (middleware, server components) and inlined into the client bundle,
 * keeping demo/real-auth decisions consistent across the render boundary.
 *
 * Design goal: the app must build and run with ZERO environment variables set.
 * When no Clerk keys are present we automatically fall back to demo mode so the
 * dashboard is reachable without a live auth provider.
 */

function readPublishableKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

/** True when a Clerk publishable key is configured. */
export const CLERK_ENABLED: boolean = Boolean(readPublishableKey());

/**
 * Demo mode provides a deterministic, signed-in "Demo User" without any real
 * auth provider. Resolution rules:
 *  - `NEXT_PUBLIC_DEMO_MODE=1` -> forced ON
 *  - `NEXT_PUBLIC_DEMO_MODE=0` -> forced OFF (requires real Clerk keys)
 *  - unset                     -> ON unless Clerk keys are present
 */
export const DEMO_MODE: boolean = (() => {
  const flag = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (flag === "1") return true;
  if (flag === "0") return false;
  return !CLERK_ENABLED;
})();

/** Use the real Clerk integration only when demo mode is off AND keys exist. */
export const USE_CLERK: boolean = CLERK_ENABLED && !DEMO_MODE;
