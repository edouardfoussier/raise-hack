import type { Metadata } from "next";

import { AvatarUploadCard } from "@/components/assets/avatar-upload-card";
import { ClonedVoiceCard } from "@/components/assets/cloned-voice-card";
import { TeamMembersCard } from "@/components/assets/team-members-card";
import { getCurrentUser } from "@/lib/auth";
import { DEMO_USER, getAssets, getTeam } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Assets" };

export default async function AssetsPage() {
  const user = (await getCurrentUser()) ?? DEMO_USER;
  const assets = getAssets();
  const team = getTeam();
  const avatarUrl = assets.avatarUrl ?? DEMO_USER.imageUrl;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Assets
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the avatar, cloned voice and teammates behind your demos.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AvatarUploadCard initialAvatarUrl={avatarUrl} name={user.name} />
        <ClonedVoiceCard voice={assets.clonedVoice} />
      </div>

      <TeamMembersCard members={team} currentUserId={user.id} />
    </div>
  );
}
