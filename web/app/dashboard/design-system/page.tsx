import type { Metadata } from "next";
import { Palette } from "lucide-react";

import { PageStub } from "@/components/dashboard/page-stub";

export const metadata: Metadata = { title: "Design System" };

export default function DesignSystemPage() {
  return (
    <PageStub
      title="Design System"
      description="Tokens, components and patterns that power Scenario's UI."
      blurb="A living design-system reference is coming soon — colors, typography and the shadcn/ui components used across the app."
      icon={Palette}
    />
  );
}
