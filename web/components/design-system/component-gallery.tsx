"use client";

import type { ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  Captions,
  Eye,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPoster } from "@/components/video-poster";
import { cn } from "@/lib/utils";

function GalleryCard({
  title,
  hint,
  className,
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {hint ? (
          <span className="font-mono text-[11px] text-muted-foreground/70">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

const buttonVariantNames = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

const badgeVariantNames = [
  "default",
  "secondary",
  "outline",
  "destructive",
  "ghost",
] as const;

export function ComponentGallery({ avatars }: { avatars: string[] }) {
  return (
    <TooltipProvider>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Buttons */}
        <GalleryCard
          title="Buttons"
          hint="ui/button"
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {buttonVariantNames.map((variant) => (
                <Button key={variant} variant={variant}>
                  {variant}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Play">
                <Play className="fill-current" />
              </Button>
              <Button className="gap-1.5">
                <Sparkles className="size-4" />
                Generate demo
              </Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
            </div>
          </div>
        </GalleryCard>

        {/* Badges */}
        <GalleryCard title="Badges" hint="ui/badge">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {badgeVariantNames.map((variant) => (
                <Badge key={variant} variant={variant}>
                  {variant}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <Captions className="size-3.5" />
                Captions
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                Ready
              </Badge>
              <Badge className="gap-1.5">
                <Eye className="size-3.5" />
                1,284
              </Badge>
            </div>
          </div>
        </GalleryCard>

        {/* Inputs */}
        <GalleryCard title="Inputs" hint="ui/input">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Work email</label>
              <Input placeholder="you@company.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Repository</label>
              <Input defaultValue="getscenario/web" />
            </div>
            <Input placeholder="Disabled" disabled />
          </div>
        </GalleryCard>

        {/* Avatars */}
        <GalleryCard title="Avatars" hint="ui/avatar">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar size="sm">
                <AvatarImage src={avatars[0]} alt="" />
                <AvatarFallback>S</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarImage src={avatars[1] ?? avatars[0]} alt="" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <Avatar size="lg">
                <AvatarImage src={avatars[2] ?? avatars[0]} alt="" />
                <AvatarFallback>L</AvatarFallback>
              </Avatar>
            </div>
            <AvatarGroup>
              {avatars.slice(0, 3).map((src, index) => (
                <Avatar key={index}>
                  <AvatarImage src={src} alt="" />
                  <AvatarFallback>{index + 1}</AvatarFallback>
                </Avatar>
              ))}
              <AvatarGroupCount>+4</AvatarGroupCount>
            </AvatarGroup>
          </div>
        </GalleryCard>

        {/* Tooltips */}
        <GalleryCard title="Tooltips" hint="ui/tooltip">
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "gap-1.5",
                    )}
                  >
                    <Bell className="size-3.5" />
                    Hover me
                  </button>
                }
              />
              <TooltipContent>Base UI tooltip, flame-themed</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Add"
                    className={buttonVariants({
                      variant: "secondary",
                      size: "icon-sm",
                    })}
                  >
                    <Plus className="size-3.5" />
                  </button>
                }
              />
              <TooltipContent side="bottom">Add a project</TooltipContent>
            </Tooltip>
          </div>
        </GalleryCard>

        {/* Composed card */}
        <GalleryCard title="Card" hint="ui/card">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Onboarding in 60s</CardTitle>
              <CardDescription>Scenario Web</CardDescription>
              <CardAction>
                <Badge variant="secondary">Ready</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="group/poster">
                <VideoPoster
                  color="#ff5a1f"
                  durationSec={62}
                  className="aspect-video w-full rounded-lg"
                />
              </div>
            </CardContent>
            <CardFooter className="justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Eye className="size-3.5" />
                1,284 views
              </span>
              <span className="inline-flex items-center gap-1 text-primary">
                Open
                <ArrowRight className="size-3.5" />
              </span>
            </CardFooter>
          </Card>
        </GalleryCard>

        {/* Separator + Skeleton */}
        <GalleryCard
          title="Separator & Skeleton"
          hint="ui/separator · ui/skeleton"
          className="lg:col-span-2 xl:col-span-1"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <span>Overview</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">Analytics</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">Share</span>
            </div>
            <Separator />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        </GalleryCard>
      </div>
    </TooltipProvider>
  );
}
