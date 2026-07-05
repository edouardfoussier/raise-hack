/**
 * In-memory mock data for the Scenario web app.
 *
 * NO database — everything here is deterministic and read-only. Downstream
 * pages/agents should consume the exported accessors (getProjects, getVideos,
 * ...) rather than importing the raw arrays, so the storage layer can evolve
 * later without changing call sites.
 */

import type {
  AppUser,
  Assets,
  Billing,
  Channels,
  Project,
  TeamMember,
  Video,
} from "./types";

/** Build a deterministic, offline SVG avatar (data URI) from initials. */
function avatarDataUri(initials: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="128" height="128" rx="24" fill="url(#g)"/><text x="50%" y="50%" dy=".35em" font-family="Geist, Inter, system-ui, sans-serif" font-size="52" font-weight="600" fill="#04110f" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Deterministic signed-in user for demo mode. Also surfaces as the account
 * owner in the team list.
 */
export const DEMO_USER: AppUser = {
  id: "user_demo",
  name: "Demo User",
  email: "demo@getscenar.io",
  imageUrl: avatarDataUri("DU", "#ff8a4d", "#ff5a1f"),
  isDemo: true,
};

const projects: Project[] = [
  {
    id: "prj_scenario_web",
    name: "Scenario Web",
    repo: "getscenario/web",
    appUrl: "https://app.getscenar.io",
    framework: "Next.js",
    lastDeployedAt: "2026-06-28T14:22:00.000Z",
    thumbnailColor: "#ff5a1f",
    description:
      "Marketing site and account dashboard for Scenario — the surface users land on to view and share generated demos.",
  },
  {
    id: "prj_deja_bu",
    name: "Déjà-bu",
    repo: "getscenario/deja-bu",
    appUrl: "https://deja-bu.demo.getscenar.io",
    framework: "Remix",
    lastDeployedAt: "2026-07-01T09:10:00.000Z",
    thumbnailColor: "#6366f1",
    description:
      "Inventory reception app used as a live target when filming deterministic Scenario walkthroughs against a real backend.",
  },
];

const videos: Video[] = [
  /* -----------------------------------------------------------------------
   * Real media generated during the hackathon. Files live in
   * `public/videos/<name>.mp4` (+ `.jpg` thumbnail) and are committed so the
   * dashboard looks alive without a database or CDN.
   * --------------------------------------------------------------------- */
  {
    id: "vid_submission",
    title: "Scenario — 60-second submission",
    projectId: "prj_scenario_web",
    thumbnailColor: "#ff5a1f",
    thumbnailUrl: "/videos/submission.jpg",
    videoUrl: "/videos/submission.mp4",
    durationSec: 57,
    status: "ready",
    createdAt: "2026-07-05T02:10:00.000Z",
    shareId: "scenario-submission",
    analytics: {
      views: 34,
      uniqueIps: 21,
      lastViewedAt: "2026-07-05T09:41:00.000Z",
    },
    hasCaptions: true,
    hasVoiceover: true,
  },
  {
    id: "vid_deja_reception",
    title: "Déjà Bu — delivery reception",
    projectId: "prj_deja_bu",
    thumbnailColor: "#14b8a6",
    thumbnailUrl: "/videos/deja-reception.jpg",
    videoUrl: "/videos/deja-reception.mp4",
    durationSec: 42,
    status: "ready",
    createdAt: "2026-07-05T01:26:00.000Z",
    shareId: "deja-reception",
    analytics: {
      views: 12,
      uniqueIps: 9,
      lastViewedAt: "2026-07-05T08:55:00.000Z",
    },
    hasCaptions: true,
    hasVoiceover: true,
  },
  {
    id: "vid_onboarding_sample",
    title: "Sample — onboarding demo",
    projectId: "prj_deja_bu",
    thumbnailColor: "#22d3ee",
    thumbnailUrl: "/videos/onboarding-demo.jpg",
    videoUrl: "/videos/onboarding-demo.mp4",
    durationSec: 25,
    status: "ready",
    createdAt: "2026-07-05T01:03:00.000Z",
    shareId: "onboarding-demo",
    analytics: {
      views: 8,
      uniqueIps: 7,
      lastViewedAt: "2026-07-05T07:12:00.000Z",
    },
    hasCaptions: true,
    hasVoiceover: true,
  },
  {
    id: "vid_deja_new_reception",
    title: "Déjà Bu — new reception flow",
    projectId: "prj_deja_bu",
    thumbnailColor: "#6366f1",
    thumbnailUrl: "/videos/deja-new-reception.jpg",
    videoUrl: "/videos/deja-new-reception.mp4",
    durationSec: 39,
    status: "ready",
    createdAt: "2026-07-05T02:17:00.000Z",
    shareId: "deja-new-reception",
    analytics: {
      views: 5,
      uniqueIps: 4,
      lastViewedAt: "2026-07-05T09:02:00.000Z",
    },
    hasCaptions: true,
    hasVoiceover: false,
  },
  {
    id: "vid_deja_resume_reception",
    title: "Déjà Bu — resume a reception",
    projectId: "prj_deja_bu",
    thumbnailColor: "#f59e0b",
    thumbnailUrl: "/videos/deja-resume-reception.jpg",
    videoUrl: "/videos/deja-resume-reception.mp4",
    durationSec: 26,
    status: "ready",
    createdAt: "2026-07-05T02:29:00.000Z",
    shareId: "deja-resume-reception",
    analytics: {
      views: 3,
      uniqueIps: 3,
      lastViewedAt: "2026-07-05T09:18:00.000Z",
    },
    hasCaptions: true,
    hasVoiceover: false,
  },
  {
    id: "vid_deja_catalogue",
    title: "Déjà Bu — catalogue search",
    projectId: "prj_deja_bu",
    thumbnailColor: "#8b5cf6",
    thumbnailUrl: "/videos/deja-catalogue.jpg",
    videoUrl: "/videos/deja-catalogue.mp4",
    durationSec: 16,
    status: "ready",
    createdAt: "2026-07-05T01:29:00.000Z",
    shareId: "deja-catalogue",
    analytics: {
      views: 2,
      uniqueIps: 2,
      lastViewedAt: "2026-07-05T08:40:00.000Z",
    },
    hasCaptions: true,
    hasVoiceover: false,
  },
  {
    id: "vid_onboarding",
    title: "Onboarding in 60 seconds",
    projectId: "prj_scenario_web",
    thumbnailColor: "#ff5a1f",
    durationSec: 62,
    status: "ready",
    createdAt: "2026-06-29T16:40:00.000Z",
    shareId: "onboarding-60s",
    analytics: {
      views: 0,
      uniqueIps: 0,
      lastViewedAt: null,
    },
    hasCaptions: true,
    hasVoiceover: true,
  },
  {
    id: "vid_checkout",
    title: "New checkout flow",
    projectId: "prj_scenario_web",
    thumbnailColor: "#8b5cf6",
    durationSec: 48,
    status: "ready",
    createdAt: "2026-06-30T10:05:00.000Z",
    shareId: "checkout-flow",
    analytics: {
      views: 0,
      uniqueIps: 0,
      lastViewedAt: null,
    },
    hasCaptions: true,
    hasVoiceover: false,
  },
  {
    id: "vid_reception",
    title: "Reception → stock update",
    projectId: "prj_deja_bu",
    thumbnailColor: "#f59e0b",
    durationSec: 74,
    status: "ready",
    createdAt: "2026-07-01T12:20:00.000Z",
    shareId: "reception-stock",
    analytics: {
      views: 0,
      uniqueIps: 0,
      lastViewedAt: null,
    },
    hasCaptions: true,
    hasVoiceover: true,
  },
  {
    id: "vid_mobile",
    title: "Mobile capture (iOS)",
    projectId: "prj_deja_bu",
    thumbnailColor: "#22d3ee",
    durationSec: 39,
    status: "processing",
    createdAt: "2026-07-04T13:45:00.000Z",
    shareId: "mobile-capture",
    analytics: {
      views: 0,
      uniqueIps: 0,
      lastViewedAt: null,
    },
    hasCaptions: false,
    hasVoiceover: false,
  },
];

const team: TeamMember[] = [
  {
    id: DEMO_USER.id,
    name: DEMO_USER.name,
    avatarUrl: DEMO_USER.imageUrl,
    role: "Owner",
  },
];

const assets: Assets = {
  avatarUrl: DEMO_USER.imageUrl,
  clonedVoice: {
    name: "Demo User — cloned voice",
    status: "ready",
  },
};

const channels: Channels = {
  slack: true,
  x: false,
  github: true,
};

const billing: Billing = {
  plan: "free",
};

/* -------------------------------------------------------------------------- */
/*  Accessors — the stable public API downstream pages should read.           */
/* -------------------------------------------------------------------------- */

export function getProjects(): Project[] {
  return projects.slice();
}

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function getVideos(): Video[] {
  return videos.slice();
}

export function getVideoById(id: string): Video | undefined {
  return videos.find((v) => v.id === id);
}

export function getVideoByShareId(shareId: string): Video | undefined {
  return videos.find((v) => v.shareId === shareId);
}

export function getTeam(): TeamMember[] {
  return team.slice();
}

export function getAssets(): Assets {
  return assets;
}

export function getChannels(): Channels {
  return channels;
}

export function getBilling(): Billing {
  return billing;
}

/* -------------------------------------------------------------------------- */
/*  Convenience derivations (extra, non-contract helpers).                     */
/* -------------------------------------------------------------------------- */

/** Aggregate numbers used by the dashboard overview stat cards. */
export function getDashboardStats(): {
  projectCount: number;
  videoCount: number;
  readyCount: number;
  totalViews: number;
} {
  return {
    projectCount: projects.length,
    videoCount: videos.length,
    readyCount: videos.filter((v) => v.status === "ready").length,
    totalViews: videos.reduce((sum, v) => sum + v.analytics.views, 0),
  };
}

/** The seeded video used by the marketing "See a demo" call to action. */
export function getFeaturedShareId(): string {
  const firstReady = videos.find((v) => v.status === "ready");
  return (firstReady ?? videos[0]).shareId;
}
