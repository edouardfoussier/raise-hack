import { NextResponse } from "next/server";

import { getVideos } from "@/lib/mock-data";

/**
 * Public videos endpoint.
 *
 * GET  -> returns the in-memory list of videos (read-only mock data).
 * POST -> stubs "generate a demo": accepts optional { projectId, prompt } and
 *         returns a freshly minted, mock processing video. No real work is
 *         performed and nothing is persisted.
 */

export async function GET() {
  return NextResponse.json({ videos: getVideos() });
}

export async function POST(request: Request) {
  let body: { projectId?: string; prompt?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional; ignore malformed / empty payloads.
  }

  const slug = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const id = `vid_${slug}`;
  const shareId = `sc-${slug}`;

  return NextResponse.json(
    {
      id,
      shareId,
      status: "processing" as const,
      shareUrl: `/v/${shareId}`,
      projectId: body.projectId ?? null,
      prompt: body.prompt ?? null,
    },
    { status: 201 },
  );
}
