"use client";

import type { ComponentType, SVGProps } from "react";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { GithubIcon, SlackIcon, XLogoIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { Channels } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ChannelId = keyof Channels;

const META: Record<
  ChannelId,
  {
    name: string;
    description: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
  }
> = {
  slack: {
    name: "Slack",
    description: "Post new demos to a channel the moment they're ready.",
    Icon: SlackIcon,
  },
  x: {
    name: "X",
    description: "Share new demos with your followers in one click.",
    Icon: XLogoIcon,
  },
  github: {
    name: "GitHub",
    description: "Drop a demo link on the matching pull request.",
    Icon: GithubIcon,
  },
};

export function ChannelCard({
  id,
  connected: initialConnected,
}: {
  id: ChannelId;
  connected: boolean;
}) {
  const [connected, setConnected] = useState(initialConnected);
  const { name, description, Icon } = META[id];

  function toggle() {
    if (connected) {
      setConnected(false);
      toast(`${name} disconnected`, {
        description: "New demos won't be posted here.",
      });
    } else {
      setConnected(true);
      toast.success(`${name} connected`, {
        description: "Demo mode — no real OAuth in this build.",
      });
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-secondary text-foreground ring-1 ring-border">
          <Icon className="size-5" />
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs",
            connected ? "text-primary" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "inline-block size-1.5 rounded-full",
              connected ? "bg-primary" : "bg-muted-foreground/50",
            )}
          />
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      <h2 className="mt-4 font-heading text-base font-medium">{name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <Button
        variant={connected ? "outline" : "default"}
        className="mt-5 w-full gap-1.5"
        onClick={toggle}
      >
        {connected ? (
          <>
            <Check className="size-4" />
            Connected
          </>
        ) : (
          <>
            <Plus className="size-4" />
            Connect
          </>
        )}
      </Button>
    </div>
  );
}
