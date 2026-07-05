"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Logo } from "@/components/logo";
import { LogoutButton } from "./logout-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border/70">
          <SheetTitle className="text-left">
            <Link
              href="/"
              aria-label="Scenario home"
              onClick={() => setOpen(false)}
              className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Logo />
            </Link>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Dashboard navigation
          </SheetDescription>
        </SheetHeader>
        <div className="flex h-[calc(100%-4rem)] flex-col">
          <div className="flex-1 overflow-y-auto p-3">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
          <div className="border-t border-border/70 p-3">
            <LogoutButton />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
