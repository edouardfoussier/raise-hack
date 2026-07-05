import type { Metadata } from "next";

import { GenerateWizard } from "@/components/generate/generate-wizard";

export const metadata: Metadata = { title: "Generate demo" };

export default function GeneratePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Generate a demo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Point Diffender at your app, pick a voice and avatar, write the
          narration, and film a deterministic walkthrough.
        </p>
      </div>

      <GenerateWizard />
    </div>
  );
}
