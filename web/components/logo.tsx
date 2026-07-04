import { cn } from "@/lib/utils";

/** Scenario brand mark: a rounded teal tile with a play glyph. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_-6px_var(--primary)]",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none">
        <path
          d="M9 7.5v9l7-4.5-7-4.5Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Full lockup: brand mark + wordmark. */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWordmark ? (
        <span className="font-heading text-[0.95rem] font-semibold tracking-tight text-foreground">
          Scenario
        </span>
      ) : null}
    </span>
  );
}
