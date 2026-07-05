import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

import { GithubIcon } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { USE_CLERK } from "@/lib/env";
import { DEMO_USER } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  if (USE_CLERK) {
    return <SignIn />;
  }

  return (
    <Card className="w-full max-w-sm rounded-2xl">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-xl">Sign in to Diffender</CardTitle>
        <CardDescription>Continue to your dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "default" }),
            "h-11 w-full gap-2 rounded-xl text-sm font-medium",
          )}
        >
          <GithubIcon className="size-4" />
          Continue with GitHub
        </Link>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          demo mode
          <span className="h-px flex-1 bg-border" />
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:border-primary/40"
        >
          <Avatar className="size-9">
            <AvatarImage src={DEMO_USER.imageUrl} alt="" />
            <AvatarFallback>DU</AvatarFallback>
          </Avatar>
          <div className="min-w-0 text-left text-sm">
            <p className="font-medium leading-tight">{DEMO_USER.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {DEMO_USER.email}
            </p>
          </div>
          <ArrowRight className="ml-auto size-4 text-muted-foreground" />
        </Link>

        <p className="text-center text-xs text-muted-foreground">
          You&apos;ll be signed in as a deterministic demo user. Add Clerk keys
          and set <span className="font-mono">NEXT_PUBLIC_DEMO_MODE=0</span> to
          enable real GitHub OAuth.
        </p>
      </CardContent>
    </Card>
  );
}
