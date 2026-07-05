import { readFile } from "node:fs/promises";
import path from "node:path";

import { WebClient } from "@slack/web-api";

/**
 * POST /api/share-slack — upload a generated demo mp4 to Slack.
 *
 * Body: { videoPath | videoUrl, title }. The mp4 is resolved on disk from
 * web/public/... and uploaded to SLACK_CHANNEL via @slack/web-api's
 * `files.uploadV2`, with a friendly `initial_comment`.
 *
 * Secrets (SLACK_BOT_TOKEN, SLACK_CHANNEL) live in web/.env.local and are read
 * from process.env only — never hardcoded, never returned.
 *
 * Returns { ok: true, permalink? } on success, or { error } with a helpful
 * message for the common misconfigurations (bot not invited, wrong channel,
 * missing scopes).
 */

// Reads the filesystem and talks to Slack — must run on the Node.js runtime.
export const runtime = "nodejs";

type ShareBody = {
  /** Public path or URL to the mp4, e.g. "/videos/submission.mp4". */
  videoPath?: string;
  videoUrl?: string;
  /** Human title used for the Slack file + comment. */
  title?: string;
};

/** JSON error helper (matches /api/generate's shape). */
function fail(error: string, status = 400): Response {
  return Response.json({ error }, { status });
}

/**
 * Map a public asset reference ("/videos/foo.mp4", a bare filename, or a full
 * URL whose path lives under /public) to an absolute path inside web/public.
 * Guards against path traversal so only files under /public are ever read.
 */
function resolvePublicMp4(ref: string): string | null {
  let rel = ref.trim();
  if (!rel) return null;

  // Accept a full URL — keep only its pathname.
  if (/^https?:\/\//i.test(rel)) {
    try {
      rel = new URL(rel).pathname;
    } catch {
      return null;
    }
  }

  // Normalise leading slash; only .mp4 files are shareable.
  rel = rel.replace(/^\/+/, "");
  if (!rel.toLowerCase().endsWith(".mp4")) return null;

  const publicDir = path.join(process.cwd(), "public");
  const abs = path.resolve(publicDir, rel);

  // Containment check — abs must stay inside /public.
  const rootWithSep = publicDir.endsWith(path.sep)
    ? publicDir
    : publicDir + path.sep;
  if (abs !== publicDir && !abs.startsWith(rootWithSep)) return null;

  return abs;
}

/** A Slack channel ID looks like C…/G…/D… (uppercase alnum). */
const CHANNEL_ID_RE = /^[CGDZ][A-Z0-9]{6,}$/;

/**
 * Resolve a channel reference ("#product-review", "product-review", or a raw
 * channel ID like "C0123") to a Slack channel ID **without** requiring the
 * channels:read scope.
 *
 * Strategy:
 *  1. If it's already an ID, use it.
 *  2. Try conversations.list (needs channels:read) — best-effort.
 *  3. Fall back to chat.postMessage: it accepts a channel *name*, only needs
 *     chat:write, and returns the resolved channel ID (plus the message `ts`,
 *     which we reuse so the file lands as a threaded reply under our comment).
 *
 * Returns { id, threadTs? } — threadTs is set only when we posted the intro
 * comment ourselves (so the caller shouldn't post it again).
 */
async function resolveChannel(
  client: WebClient,
  channel: string,
  initialComment: string,
): Promise<{ id: string; threadTs?: string } | null> {
  const raw = channel.trim();
  if (CHANNEL_ID_RE.test(raw)) return { id: raw };

  const name = raw.replace(/^#/, "").toLowerCase();

  // 2 — conversations.list (skipped silently if the scope is missing).
  try {
    let cursor: string | undefined;
    do {
      const res = await client.conversations.list({
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 200,
        cursor,
      });
      const match = res.channels?.find((c) => c.name?.toLowerCase() === name);
      if (match?.id) return { id: match.id };
      cursor = res.response_metadata?.next_cursor || undefined;
    } while (cursor);
  } catch {
    // Missing channels:read — fall through to the chat.postMessage path.
  }

  // 3 — chat.postMessage resolves the name → id with only chat:write, and its
  // `ts` anchors the upload as a threaded reply beneath the intro comment.
  const posted = await client.chat.postMessage({ channel: raw, text: initialComment });
  const id = posted.channel as string | undefined;
  if (!id) return null;
  return { id, threadTs: posted.ts as string | undefined };
}

/** Dig the shared file's permalink out of the uploadV2 result, if present. */
function extractPermalink(result: unknown): string | undefined {
  // uploadV2 returns { ok, files: [ completeUploadExternalResponse, ... ] },
  // and each completion carries its own nested `files: [{ permalink, ... }]`.
  const top = result as { files?: Array<{ files?: Array<{ permalink?: string }>; permalink?: string }> };
  const first = top?.files?.[0];
  return first?.files?.[0]?.permalink ?? first?.permalink;
}

export async function POST(request: Request): Promise<Response> {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  const channel = process.env.SLACK_CHANNEL?.trim();
  if (!token) return fail("Slack is not configured (missing SLACK_BOT_TOKEN).", 500);
  if (!channel) return fail("Slack is not configured (missing SLACK_CHANNEL).", 500);

  let body: ShareBody;
  try {
    body = (await request.json()) as ShareBody;
  } catch {
    return fail("invalid JSON body");
  }

  const ref = body.videoPath?.trim() || body.videoUrl?.trim();
  if (!ref) return fail("missing 'videoPath' (or 'videoUrl')");

  const title = body.title?.trim() || "Scenario demo";

  const absPath = resolvePublicMp4(ref);
  if (!absPath) {
    return fail("'videoPath' must point to an .mp4 under web/public");
  }

  let file: Buffer;
  try {
    file = await readFile(absPath);
  } catch {
    return fail(`video not found on disk: ${ref}`, 404);
  }

  const filename = `${path.basename(absPath, ".mp4")}.mp4`;
  const comment = `🎬 New Scenario demo — ${title}`;
  const client = new WebClient(token);

  try {
    // uploadV2 needs a channel *ID*. Resolve #product-review → C… — falling
    // back to chat.postMessage when channels:read isn't granted.
    const resolved = await resolveChannel(client, channel, comment);
    if (!resolved) {
      return fail(
        `channel "${channel}" not found — invite the bot with /invite in that channel, or check SLACK_CHANNEL.`,
        404,
      );
    }

    const result = await client.files.uploadV2({
      channel_id: resolved.id,
      file,
      filename,
      title,
      // If we posted the intro comment while resolving the channel, attach the
      // file as a reply in that thread instead of posting the comment twice.
      ...(resolved.threadTs
        ? { thread_ts: resolved.threadTs }
        : { initial_comment: comment }),
    });

    return Response.json({ ok: true, permalink: extractPermalink(result) });
  } catch (e) {
    // Surface the precise Slack error code so scopes/invite issues are actionable.
    const data = (e as { data?: { error?: string } })?.data;
    const code = data?.error ?? (e as Error)?.message ?? "slack_upload_failed";

    const hint: Record<string, string> = {
      not_in_channel: `The bot isn't in ${channel} — run "/invite @<your-bot>" in that channel.`,
      channel_not_found: `Channel ${channel} not found — check SLACK_CHANNEL or invite the bot.`,
      missing_scope:
        "The bot token is missing a scope — it needs files:write and chat:write.",
      not_authed: "SLACK_BOT_TOKEN is missing or invalid.",
      invalid_auth: "SLACK_BOT_TOKEN is invalid or revoked.",
    };

    return fail(hint[code] ?? `Slack error: ${code}`, 502);
  }
}
