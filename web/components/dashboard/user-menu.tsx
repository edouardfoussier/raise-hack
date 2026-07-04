"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { CreditCard, LogOut, Settings, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { USE_CLERK } from "@/lib/env";
import type { AppUser } from "@/lib/types";

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

export function UserMenu({ user }: { user: AppUser }) {
  // Real Clerk session: use Clerk's own account switcher.
  if (USE_CLERK) {
    return <UserButton />;
  }

  const initials = initialsOf(user.name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <Avatar className="size-8">
          <AvatarImage src={user.imageUrl} alt={user.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2.5 p-2">
            <Avatar className="size-9">
              <AvatarImage src={user.imageUrl} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard/assets" />}>
          <Settings className="text-muted-foreground" />
          Account & assets
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/dashboard/billing" />}>
          <CreditCard className="text-muted-foreground" />
          Billing
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/dashboard/billing" />}>
          <Sparkles className="text-primary" />
          Upgrade plan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/" />}>
          <LogOut className="text-muted-foreground" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
