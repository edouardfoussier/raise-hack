"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Small Sun/Moon button that flips between light and dark. `next-themes`
 * toggles `.dark` on <html> and persists the choice to localStorage.
 *
 * We wait for mount before reading `resolvedTheme` so the rendered icon always
 * matches the client's actual theme (avoids a hydration mismatch).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? (
        <Moon className="size-4.5" />
      ) : (
        <Sun className="size-4.5" />
      )}
    </Button>
  );
}
