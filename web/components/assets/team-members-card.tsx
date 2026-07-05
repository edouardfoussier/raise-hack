"use client";

import { Trash2, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toTeamMember, useTeamStore } from "@/lib/team-store";
import type { TeamMember, TeamRole } from "@/lib/types";
import { AddMemberModal } from "./add-member-modal";

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function RoleBadge({ role }: { role: TeamRole }) {
  if (role === "Owner") {
    return <Badge className="shrink-0">Owner</Badge>;
  }
  if (role === "Admin") {
    return (
      <Badge variant="secondary" className="shrink-0">
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0">
      Member
    </Badge>
  );
}

/**
 * Team card. The seed `members` (the demo owner) are rendered as-is; teammates
 * added through the "Add a team member" modal come from the local team store
 * (localStorage) and can be removed. Real, working local add — no fake list.
 */
export function TeamMembersCard({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId?: string;
}) {
  const { hydrated, added, addMember, removeMember } = useTeamStore();

  const addedAsMembers = hydrated ? added.map(toTeamMember) : [];
  const all = [...members, ...addedAsMembers];
  const addedIds = new Set(added.map((m) => m.id));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Users className="size-4" />
          </span>
          <div>
            <h2 className="font-heading text-base font-medium">Team</h2>
            <p className="text-xs text-muted-foreground">
              {all.length} {all.length === 1 ? "member" : "members"} on this
              workspace.
            </p>
          </div>
        </div>
        <AddMemberModal onAdd={addMember} />
      </div>

      <ul className="mt-4 divide-y divide-border/70">
        {all.map((member) => {
          const removable = addedIds.has(member.id);
          return (
            <li key={member.id} className="flex items-center gap-3 py-3">
              <Avatar className="size-9">
                <AvatarImage src={member.avatarUrl} alt={member.name} />
                <AvatarFallback>{initialsOf(member.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.name}
                  {member.id === currentUserId ? (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      (you)
                    </span>
                  ) : null}
                </p>
              </div>
              <RoleBadge role={member.role} />
              {removable ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${member.name}`}
                  onClick={() => removeMember(member.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
