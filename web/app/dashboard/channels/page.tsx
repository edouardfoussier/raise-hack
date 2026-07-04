import type { Metadata } from "next";

import { ChannelCard, type ChannelId } from "@/components/channels/channel-card";
import { getChannels } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Channels" };

export default function ChannelsPage() {
  const channels = getChannels();
  const order: ChannelId[] = ["slack", "x", "github"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Channels
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-publish every new demo to the places your team already works.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {order.map((id) => (
          <ChannelCard key={id} id={id} connected={channels[id]} />
        ))}
      </div>
    </div>
  );
}
