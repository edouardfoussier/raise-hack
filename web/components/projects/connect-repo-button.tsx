"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { GithubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConnectRepoButton({ className }: { className?: string }) {
  function handleClick() {
    toast("Connect a repo", {
      description: "Repo connection is coming soon. Stay tuned!",
      icon: <GithubIcon className="size-4" />,
    });
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={cn("h-10 gap-2 px-4", className)}
    >
      <Plus className="size-4" />
      Connect repo
    </Button>
  );
}
