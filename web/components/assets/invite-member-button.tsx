"use client";

import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function InviteMemberButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() =>
        toast("Invitations — coming soon", {
          description: "Invite teammates by email to collaborate on demos.",
        })
      }
    >
      <UserPlus className="size-3.5" />
      Invite member
    </Button>
  );
}
