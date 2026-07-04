import type { Metadata } from "next";
import { Film } from "lucide-react";

import { PageStub } from "@/components/dashboard/page-stub";

export const metadata: Metadata = { title: "Videos" };

export default function VideosPage() {
  return (
    <PageStub
      title="Videos"
      description="Browse, organize and share every demo you have generated."
      blurb="The full video library is coming soon — with filtering, sharing controls and per-clip analytics."
      icon={Film}
    />
  );
}
