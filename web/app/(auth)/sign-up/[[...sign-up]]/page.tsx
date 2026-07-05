import type { Metadata } from "next";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

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
  title: "Sign up",
};

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

export default function SignUpPage() {
  if (USE_CLERK) {
    return (
      <div className="flex w-full flex-col items-center">
        <SignUp
          appearance={appearance}
          fallbackRedirectUrl="/dashboard"
          signInUrl="/sign-in"
        />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-sm rounded-2xl">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Start shipping demos with Diffender</CardDescription>
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
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
