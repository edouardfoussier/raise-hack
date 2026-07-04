import Link from "next/link";

import { Logo } from "@/components/logo";
import { GithubIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { getFeaturedShareId } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
];

export function SiteHeader() {
  const featured = getFeaturedShareId();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={`/v/${featured}`}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Demo
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "hidden h-9 px-3 sm:inline-flex",
            )}
          >
            Sign in
          </Link>
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: "default" }),
              "h-9 gap-2 px-4",
            )}
          >
            <GithubIcon className="size-4" />
            <span className="hidden sm:inline">Sign in with GitHub</span>
            <span className="sm:hidden">Sign in</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
