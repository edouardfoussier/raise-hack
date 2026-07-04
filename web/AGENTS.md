<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Scenario web — agent notes

- **Stack:** Next.js 16 (App Router) · Tailwind v4 · shadcn/ui (Base UI, `base-nova`) · Clerk. Middleware lives in `proxy.ts` (Next 16 rename), not `middleware.ts`.
- **Run:** `npm install` then `npm run dev` (port 3000). No env vars needed — the app defaults to **demo mode**.
- **Data contract:** read from `lib/mock-data.ts` accessors (`getProjects`, `getVideos`, `getVideoByShareId`, `getTeam`, `getAssets`, `getChannels`, `getBilling`, …) typed by `lib/types.ts`. Keep these shapes stable; do not rewrite them. Data is in-memory only — no database.
- **Auth:** use `getCurrentUser()` from `lib/auth.ts`. Demo vs real-Clerk is decided by `lib/env.ts` (`DEMO_MODE`, `USE_CLERK`). Never assume Clerk keys exist — the app must build/run without them.
- **Design:** dark, premium, one electric-teal accent. Build from theme tokens (`bg-card`, `text-muted-foreground`, `border-border`, `text-primary`, …) defined in `app/globals.css`. Prefer `rounded-2xl` cards and generous spacing.
- **Stubs to build out:** the `/dashboard/{projects,videos,assets,channels,billing,design-system}` pages are intentional placeholders (`components/dashboard/page-stub.tsx`). Replace them; reuse `VideoCard`, `ProjectCard`, `StatCard`.
- Base UI primitives use the `render` prop (not Radix's `asChild`).
