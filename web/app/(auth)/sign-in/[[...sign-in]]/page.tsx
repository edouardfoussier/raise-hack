import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

import { GithubIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { USE_CLERK } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * Themed appearance so Clerk's hosted <SignIn> matches Diffender's flame theme.
 * "Sign in with GitHub" is the primary social connection (configured on the
 * Clerk instance); the appearance just makes the buttons feel native.
 */
const appearance = {
  elements: {
    rootBox: "w-full",
    card: "bg-card border border-border shadow-none rounded-2xl",
    headerTitle: "font-heading",
    socialButtonsBlockButton:
      "border-border bg-background hover:bg-muted/60 text-foreground",
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-none",
    footerActionLink: "text-primary hover:text-primary/90",
  },
} as const;

export default function SignInPage() {
  // Real auth: Clerk drives the flow (GitHub OAuth primary, email fallback).
  if (USE_CLERK) {
    return (
      <div className="flex w-full flex-col items-center">
        <SignIn
          appearance={appearance}
          fallbackRedirectUrl="/dashboard"
          signUpUrl="/sign-up"
        />
      </div>
    );
  }

  // No Clerk keys configured — offer a direct GitHub sign-in entry point.
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
          Sign in with GitHub
        </Link>
        <p className="text-center text-sm text-muted-foreground">
          New to Diffender?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
