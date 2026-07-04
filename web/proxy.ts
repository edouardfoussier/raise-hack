import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { USE_CLERK } from "@/lib/env";

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`. Clerk's
 * `clerkMiddleware()` fully supports it — the contents are identical.
 */

// Everything under /dashboard is protected. Public routes ("/", "/v/*",
// "/api/videos", "/sign-in", "/sign-up") are simply not matched here.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

// Only construct the Clerk handler when real keys are configured. In demo mode
// this stays `null`, so Clerk is never invoked and no keys are required.
const clerkHandler = USE_CLERK
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : null;

export function proxy(req: NextRequest, event: NextFetchEvent) {
  if (clerkHandler) {
    return clerkHandler(req, event);
  }
  // Demo mode / no Clerk keys: allow all routes, including /dashboard, so an
  // automated recording can reach the dashboard without live OAuth.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
