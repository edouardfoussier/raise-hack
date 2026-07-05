import type { BillingPlan } from "@/lib/types";

export type PlanFeature = {
  label: string;
  included: boolean;
  /** Pro-defining features we want to draw the eye to. */
  highlight?: boolean;
};

export type PlanConfig = {
  id: BillingPlan;
  name: string;
  price: string;
  period: string;
  tagline: string;
  /** Pro is the recommended tier. */
  recommended?: boolean;
  features: PlanFeature[];
};

export const PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/mo",
    tagline: "For trying Diffender on a single app.",
    features: [
      { label: "Deterministic demo videos", included: true },
      { label: "Auto captions & voice-over", included: true },
      { label: "Public share links", included: true },
      { label: "Private videos", included: false, highlight: true },
      { label: "Share analytics", included: false, highlight: true },
      { label: "Priority rendering", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/mo",
    tagline: "For teams shipping demos every week.",
    recommended: true,
    features: [
      { label: "Everything in Free", included: true },
      { label: "Private videos", included: true, highlight: true },
      { label: "Share analytics", included: true, highlight: true },
      { label: "Cloned voice & custom avatar", included: true },
      { label: "Priority rendering", included: true },
      { label: "Remove Diffender branding", included: true },
    ],
  },
];
