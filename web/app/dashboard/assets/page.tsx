import type { Metadata } from "next";
import { Boxes } from "lucide-react";

import { PageStub } from "@/components/dashboard/page-stub";

export const metadata: Metadata = { title: "Assets" };

export default function AssetsPage() {
  return (
    <PageStub
      title="Assets"
      description="Manage the avatar and cloned voice used in your voice-overs."
      blurb="Asset management is coming soon — upload an avatar, clone a voice and reuse them across every demo."
      icon={Boxes}
    />
  );
}
