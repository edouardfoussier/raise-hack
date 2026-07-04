"use client";

import { useState } from "react";
import { LoaderCircle, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GenerateDemoButtonProps = {
  projectId?: string;
  label?: string;
  className?: string;
};

export function GenerateDemoButton({
  projectId,
  label = "Generate demo",
  className,
}: GenerateDemoButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompt: "Film the primary user flow end to end.",
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as { id: string; status: string };

      toast.success("Demo queued", {
        description: `${data.id} is ${data.status}. We'll notify you when it's ready.`,
      });
    } catch {
      toast.error("Couldn't start generation", {
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={loading}
      className={cn("h-9 gap-2", className)}
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <Wand2 className="size-4" />
      )}
      {label}
    </Button>
  );
}
