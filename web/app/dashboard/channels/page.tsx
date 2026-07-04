import type { Metadata } from "next";
import { Radio } from "lucide-react";

import { PageStub } from "@/components/dashboard/page-stub";

export const metadata: Metadata = { title: "Channels" };

export default function ChannelsPage() {
  return (
    <PageStub
      title="Channels"
      description="Auto-publish new demos to Slack, X and GitHub."
      blurb="Channel integrations are coming soon — connect your workspaces and share every new demo automatically."
      icon={Radio}
    />
  );
}
