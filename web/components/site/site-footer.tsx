import Link from "next/link";

import { Logo } from "@/components/logo";
import { GithubIcon, SlackIcon, XLogoIcon } from "@/components/icons";

const footerNav: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", href: "/#features" },
      { label: "Changelog", href: "/#features" },
      { label: "Design system", href: "/dashboard/design-system" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs space-y-4">
            <Logo />
            <p className="text-sm text-muted-foreground">
              An AI-native design system — detect drift, reconcile changes, and
              keep designers and engineers aligned on every commit.
            </p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Link
                href="https://github.com"
                className="grid size-9 place-items-center rounded-lg border border-border transition-colors hover:text-foreground"
                aria-label="GitHub"
              >
                <GithubIcon className="size-4" />
              </Link>
              <Link
                href="https://slack.com"
                className="grid size-9 place-items-center rounded-lg border border-border transition-colors hover:text-foreground"
                aria-label="Slack"
              >
                <SlackIcon className="size-4" />
              </Link>
              <Link
                href="https://x.com"
                className="grid size-9 place-items-center rounded-lg border border-border transition-colors hover:text-foreground"
                aria-label="X"
              >
                <XLogoIcon className="size-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-16">
            {footerNav.map((group) => (
              <div key={group.heading} className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  {group.heading}
                </p>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Diffender. All rights reserved.</p>
          <p>
            Internal code-name{" "}
            <span className="font-mono text-foreground/70">Drift</span> · built at
            RAISE 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
