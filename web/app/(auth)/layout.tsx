import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="glow-teal pointer-events-none absolute inset-x-0 top-0 h-[380px]" />
      <header className="relative mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>
      </header>
      <main className="relative flex flex-1 items-center justify-center px-4 pb-16">
        {children}
      </main>
    </div>
  );
}
