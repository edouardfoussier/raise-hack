/**
 * Shared data contract for the Scenario web app.
 *
 * These types describe the in-memory mock data exposed by `lib/mock-data.ts`.
 * Downstream pages/agents should READ this data via the accessors and rely on
 * these shapes staying stable — treat this file as the source of truth.
 */

export type Framework =
  | "Next.js"
  | "Remix"
  | "Vite"
  | "SvelteKit"
  | "Astro"
  | "Nuxt";

export interface Project {
  id: string;
  name: string;
  /** GitHub-style "owner/repo" slug. */
  repo: string;
  /** Public URL of the deployed app that Scenario films. */
  appUrl: string;
  framework: Framework;
  /** ISO-8601 timestamp of the last deploy. */
  lastDeployedAt: string;
  /** Hex color used to render a deterministic gradient poster. */
  thumbnailColor: string;
  description: string;
}

export type VideoStatus = "ready" | "processing";

export interface VideoAnalytics {
  views: number;
  uniqueIps: number;
  /** ISO-8601 timestamp, or null when never viewed. */
  lastViewedAt: string | null;
}

export interface Video {
  id: string;
  title: string;
  projectId: string;
  /** Hex color used to render a deterministic gradient poster. */
  thumbnailColor: string;
  /** Optional real thumbnail image; falls back to the gradient poster. */
  thumbnailUrl?: string;
  /** Optional real media file (served from /public); enables the real player. */
  videoUrl?: string;
  durationSec: number;
  status: VideoStatus;
  /** ISO-8601 timestamp. */
  createdAt: string;
  /** Public share slug, used at `/v/[shareId]`. */
  shareId: string;
  analytics: VideoAnalytics;
  hasCaptions: boolean;
  hasVoiceover: boolean;
}

export type TeamRole = "Owner" | "Admin" | "Member";

export interface TeamMember {
  id: string;
  name: string;
  avatarUrl: string;
  role: TeamRole;
}

export type VoiceStatus = "ready" | "training";

export interface Assets {
  avatarUrl?: string;
  clonedVoice?: {
    name: string;
    status: VoiceStatus;
  };
}

export interface Channels {
  slack: boolean;
  x: boolean;
  github: boolean;
}

export type BillingPlan = "free" | "pro";

export interface Billing {
  plan: BillingPlan;
}

/**
 * Normalized, view-model representation of the signed-in user.
 * Returned by `lib/auth.ts#getCurrentUser` for both demo and real Clerk modes.
 */
export interface AppUser {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  isDemo: boolean;
}
