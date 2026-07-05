import type { Metadata } from "next";

import { AssetsManager } from "@/components/assets/assets-manager";
import { TeamMembersCard } from "@/components/assets/team-members-card";
import { getCurrentUser } from "@/lib/auth";
import { DEMO_USER, getTeam } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Assets" };

export default async function AssetsPage() {
  const user = (await getCurrentUser()) ?? DEMO_USER;
  const team = getTeam();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Assets
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the voices, avatar photos and teammates behind your demos. The
          Generate wizard reads from here.
        </p>
      </div>

      <AssetsManager />

      <TeamMembersCard members={team} currentUserId={user.id} />
    </div>
  );
}
