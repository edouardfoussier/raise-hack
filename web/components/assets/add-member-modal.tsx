"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { TeamRole } from "@/lib/types";

const ROLES: TeamRole[] = ["Admin", "Member"];

/**
 * "Add a team member" modal. Adds a real member to the local team store
 * (localStorage) via `onAdd`, then closes. No invite emails are sent — this is
 * an honest, working local add, not a stub.
 */
export function AddMemberModal({
  onAdd,
}: {
  onAdd: (input: { name: string; email: string; role: TeamRole }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("Member");

  function reset() {
    setName("");
    setEmail("");
    setRole("Member");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Enter a name.");
      return;
    }
    onAdd({ name: trimmedName, email: email.trim(), role });
    toast.success(`Added ${trimmedName} to the workspace`);
    reset();
    setOpen(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <UserPlus className="size-3.5" />
            Add a team member
          </Button>
        }
      />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>Add a team member</SheetTitle>
            <SheetDescription>
              Add a teammate to this workspace. Stored locally on this device —
              no invite email is sent in demo mode.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 px-4">
            <div className="space-y-1.5">
              <label
                htmlFor="member-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Name
              </label>
              <Input
                id="member-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="off"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="member-email"
                className="text-xs font-medium text-muted-foreground"
              >
                Email <span className="font-normal">(optional)</span>
              </label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                inputMode="email"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Role
              </span>
              <div className="flex gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    aria-pressed={role === r}
                    className={
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                      (role === r
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40")
                    }
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button type="submit" className="w-full">
              Add member
            </Button>
            <SheetClose
              render={
                <Button type="button" variant="ghost" className="w-full">
                  Cancel
                </Button>
              }
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
