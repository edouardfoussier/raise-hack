# Scenario — web

The marketing site + account dashboard for **Scenario** (internal code-name
_Drift_). Scenario auto-generates polished, **deterministic** demo videos of a
web app — with captions, voice-over and a shareable link — straight from your
real components.

This package is the **foundation**: a premium dark/teal shell with mock,
in-memory data (no database) and a deterministic demo auth mode. Downstream
work fills in the individual dashboard sections.

## Stack

- **Next.js 16** (App Router, TypeScript) + Turbopack
- **Tailwind CSS v4** + **shadcn/ui** (Base UI primitives, `new-york`/`base-nova`)
- **Clerk** (`@clerk/nextjs`) for auth — guarded so it is optional
- Dark, premium aesthetic with a single electric-teal accent · Geist font

## Run it

No environment variables are required — the app runs in **demo mode** by default.

```bash
cd web
npm install
npm run dev       # http://localhost:3000  (demo mode ON)
```

Other scripts:

```bash
npm run build     # production build (Turbopack)
npm run start     # serve the production build
npm run lint      # eslint
```

## Auth & demo mode

Auth is centralized in `lib/auth.ts` and gated by `lib/env.ts`:

| `NEXT_PUBLIC_DEMO_MODE` | Clerk keys present | Behavior                                   |
| ----------------------- | ------------------ | ------------------------------------------ |
| _unset_ (default)       | no                 | **Demo mode** — deterministic "Demo User"  |
| `1`                     | any                | **Demo mode**                              |
| `0`                     | yes                | **Real Clerk** (GitHub OAuth)              |
| `0`                     | no                 | Demo mode (falls back safely; never crashes) |

In demo mode, `proxy.ts` (the Next.js 16 middleware) allows `/dashboard` without
a real session, so automated recordings can reach the dashboard. When real Clerk
keys are present and demo mode is off, `/dashboard(.*)` is protected and
`Sign in with GitHub` uses Clerk.

Copy `.env.example` → `.env.local` to configure real auth.

## Shared data contract

`lib/types.ts` + `lib/mock-data.ts` expose typed, in-memory data via stable
accessors — `getProjects()`, `getVideos()`, `getVideoByShareId()`, `getTeam()`,
`getAssets()`, `getChannels()`, `getBilling()`, etc. Downstream pages should
**read** these rather than redefining shapes.

## Routes

| Route                     | Access    | Purpose                                    |
| ------------------------- | --------- | ------------------------------------------ |
| `/`                       | public    | Marketing home                             |
| `/sign-in`, `/sign-up`    | public    | Auth (demo card or Clerk)                  |
| `/v/[id]`                 | public    | Shareable demo page (by `shareId`)         |
| `/api/videos`             | public    | `GET` list · `POST` stub "generate a demo" |
| `/dashboard`              | protected | Overview                                   |
| `/dashboard/*`            | protected | Projects · Videos · Assets · Channels · Billing · Design System (stubs) |
