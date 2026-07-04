/**
 * Scenario — public share page + video storage + view analytics.
 *
 * Routes:
 *   GET  /v/:id                     → public dark-theme share page (streams video from R2)
 *   POST /api/videos                → multipart upload → store in R2 → { id, shareUrl }
 *   GET  /api/videos/:id/analytics  → { views, uniqueVisitors, recent: [{ ts, country }] }
 *   GET  /r2/:id                     → raw video stream (used by the <video> element; supports Range)
 *
 * Storage bindings (see wrangler.toml):
 *   env.VIDEOS  R2 bucket           — the video files
 *   env.DB      D1 database         — the `views` + `videos` tables (schema.sql)
 *   env.IP_SALT secret              — salt for the SHA-256 IP hash (privacy)
 *
 * Privacy: we store only a SALTED SHA-256 hash of cf-connecting-ip, never the raw IP.
 */

export interface Env {
  VIDEOS: R2Bucket;
  DB: D1Database;
  IP_SALT: string;
  SHARE_BASE_URL?: string;
  // Optional richer analytics — see README. Present only if the binding is enabled.
  ANALYTICS?: AnalyticsEngineDataset;
}

const FLAME = "#FF5A1F";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      // POST /api/videos
      if (pathname === "/api/videos" && request.method === "POST") {
        return await handleUpload(request, env);
      }

      // GET /api/videos/:id/analytics
      const analyticsMatch = pathname.match(/^\/api\/videos\/([A-Za-z0-9_-]+)\/analytics$/);
      if (analyticsMatch && request.method === "GET") {
        return await handleAnalytics(analyticsMatch[1], env);
      }

      // GET /r2/:id  — raw video bytes for the <video> player (Range-aware)
      const r2Match = pathname.match(/^\/r2\/([A-Za-z0-9_-]+)$/);
      if (r2Match && request.method === "GET") {
        return await streamVideo(r2Match[1], request, env);
      }

      // GET /v/:id  — public share page
      const shareMatch = pathname.match(/^\/v\/([A-Za-z0-9_-]+)$/);
      if (shareMatch && request.method === "GET") {
        return await handleSharePage(shareMatch[1], request, env, ctx);
      }

      // Health check / root
      if (pathname === "/" || pathname === "/health") {
        return json({ ok: true, service: "scenario-share" });
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("unhandled error", err);
      return json({ error: "internal_error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

/* -------------------------------------------------------------------------- */
/* POST /api/videos                                                            */
/* -------------------------------------------------------------------------- */

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return json({ error: "expected multipart/form-data" }, 400);
  }

  const form = await request.formData();
  const field = form.get("file") ?? form.get("video");
  // In Workers, an uploaded file arrives as a File (a Blob subtype). Detect it
  // structurally to avoid depending on a `File` global lib type.
  if (field === null || typeof field === "string" || typeof (field as Blob).stream !== "function") {
    return json({ error: "missing 'file' field" }, 400);
  }
  const file = field as File;

  const titleRaw = form.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim().length > 0
      ? titleRaw.trim().slice(0, 200)
      : "Untitled Scenario";

  const id = generateId();
  const fileType = file.type || "video/mp4";
  const key = `${id}/${sanitizeName(file.name) || "video.mp4"}`;

  await env.VIDEOS.put(key, file.stream(), {
    httpMetadata: { contentType: fileType },
  });

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO videos (id, title, key, content_type, created_at) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, title, key, fileType, now)
    .run();

  const shareUrl = `${shareBase(env)}/v/${id}`;
  return json({ id, shareUrl }, 201);
}

/* -------------------------------------------------------------------------- */
/* GET /r2/:id  — stream the video bytes (supports HTTP Range)                 */
/* -------------------------------------------------------------------------- */

async function streamVideo(id: string, request: Request, env: Env): Promise<Response> {
  const key = await resolveKey(id, env);
  if (!key) return new Response("Not found", { status: 404 });

  const range = parseRange(request.headers.get("range"));
  const object = range
    ? await env.VIDEOS.get(key, { range })
    : await env.VIDEOS.get(key);
  // A body-less object (or a miss) means we can't stream — treat as not found.
  if (!object || !("body" in object)) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  if (!headers.has("content-type")) headers.set("content-type", "video/mp4");

  const total = object.size;

  // Ranged (partial) response for seeking / progressive playback.
  if (range) {
    // Resolve the concrete byte window R2 returned, across all R2Range variants.
    let offset = 0;
    let length = total;
    if ("suffix" in range) {
      length = Math.min(range.suffix, total);
      offset = total - length;
    } else {
      offset = range.offset ?? 0;
      length = range.length ?? total - offset;
    }
    const end = offset + length - 1;
    headers.set("content-range", `bytes ${offset}-${end}/${total}`);
    headers.set("content-length", String(length));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set("content-length", String(total));
  return new Response(object.body, { status: 200, headers });
}

/* -------------------------------------------------------------------------- */
/* GET /v/:id  — public share page                                            */
/* -------------------------------------------------------------------------- */

async function handleSharePage(
  id: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const meta = await getVideoMeta(id, env);
  if (!meta) {
    return new Response(notFoundPage(), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // Record the view without blocking the response (fire-and-forget).
  ctx.waitUntil(recordView(id, request, env));

  const views = await countViews(id, env);
  const html = sharePage({
    id,
    title: meta.title,
    videoSrc: `/r2/${id}`,
    views,
    shareUrl: `${shareBase(env)}/v/${id}`,
  });

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store", // view badge should reflect latest count
    },
  });
}

/* -------------------------------------------------------------------------- */
/* GET /api/videos/:id/analytics                                              */
/* -------------------------------------------------------------------------- */

async function handleAnalytics(id: string, env: Env): Promise<Response> {
  const totals = await env.DB.prepare(
    `SELECT COUNT(*) AS views, COUNT(DISTINCT ip_hash) AS uniqueVisitors
       FROM views WHERE video_id = ?`
  )
    .bind(id)
    .first<{ views: number; uniqueVisitors: number }>();

  const recentRes = await env.DB.prepare(
    `SELECT ts, country FROM views WHERE video_id = ? ORDER BY ts DESC LIMIT 20`
  )
    .bind(id)
    .all<{ ts: number; country: string | null }>();

  return json({
    views: totals?.views ?? 0,
    uniqueVisitors: totals?.uniqueVisitors ?? 0,
    recent: (recentRes.results ?? []).map((r) => ({ ts: r.ts, country: r.country })),
  });
}

/* -------------------------------------------------------------------------- */
/* Analytics helpers                                                          */
/* -------------------------------------------------------------------------- */

async function recordView(id: string, request: Request, env: Env): Promise<void> {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ipHash = await hashIp(ip, env.IP_SALT);
  const country = (request.cf?.country as string | undefined) ?? null;
  const ua = request.headers.get("user-agent");
  const ts = Date.now();

  try {
    await env.DB.prepare(
      `INSERT INTO views (video_id, ts, ip_hash, country, ua) VALUES (?, ?, ?, ?, ?)`
    )
      .bind(id, ts, ipHash, country, ua)
      .run();
  } catch (err) {
    console.error("recordView D1 insert failed", err);
  }

  // Optional richer analytics (see README). Only if the binding is present.
  if (env.ANALYTICS) {
    try {
      env.ANALYTICS.writeDataPoint({
        blobs: [id, country ?? "XX", ua ?? ""],
        indexes: [id],
        doubles: [1],
      });
    } catch (err) {
      console.error("Analytics Engine write failed", err);
    }
  }
}

async function countViews(id: string, env: Env): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM views WHERE video_id = ?`)
    .bind(id)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Salted SHA-256 of the IP, hex-encoded. Never store or log the raw IP. */
async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* -------------------------------------------------------------------------- */
/* Video metadata / key resolution                                            */
/* -------------------------------------------------------------------------- */

interface VideoMeta {
  id: string;
  title: string;
  key: string;
  content_type: string;
}

async function getVideoMeta(id: string, env: Env): Promise<VideoMeta | null> {
  const row = await env.DB.prepare(
    `SELECT id, title, key, content_type FROM videos WHERE id = ?`
  )
    .bind(id)
    .first<VideoMeta>();
  return row ?? null;
}

/** Resolve the R2 object key for a share id — via D1, or fall back to R2 listing. */
async function resolveKey(id: string, env: Env): Promise<string | null> {
  const meta = await getVideoMeta(id, env);
  if (meta) return meta.key;
  // Fallback: objects are stored under `${id}/...`; grab the first one.
  const listed = await env.VIDEOS.list({ prefix: `${id}/`, limit: 1 });
  return listed.objects[0]?.key ?? null;
}

/* -------------------------------------------------------------------------- */
/* HTML                                                                        */
/* -------------------------------------------------------------------------- */

function sharePage(opts: {
  id: string;
  title: string;
  videoSrc: string;
  views: number;
  shareUrl: string;
}): string {
  const { title, videoSrc, views, shareUrl } = opts;
  const safeTitle = escapeHtml(title);
  const viewLabel = views === 1 ? "1 view" : `${formatCount(views)} views`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle} · Scenario</title>
<meta name="description" content="A demo filmed with Scenario — getscenar.io" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="Made with Scenario · getscenar.io" />
<meta property="og:type" content="video.other" />
<meta property="og:url" content="${escapeHtml(shareUrl)}" />
<meta property="og:video" content="${escapeHtml(shareUrl.replace(/\/v\//, "/r2/"))}" />
<meta name="twitter:card" content="player" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E%F0%9F%94%A5%3C/text%3E%3C/svg%3E" />
<style>
  :root {
    --flame: ${FLAME};
    --bg: #0b0b0d;
    --panel: #141417;
    --text: #f4f4f5;
    --muted: #a1a1aa;
    --border: #26262b;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: radial-gradient(1200px 600px at 50% -10%, #1a1a1f 0%, var(--bg) 55%);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  header {
    width: 100%;
    max-width: 960px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }
  .wordmark {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    letter-spacing: -0.01em;
    font-size: 18px;
    text-decoration: none;
    color: var(--text);
  }
  .wordmark .flame {
    width: 14px; height: 14px; border-radius: 4px;
    background: var(--flame);
    box-shadow: 0 0 14px ${FLAME}88;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--panel);
    border: 1px solid var(--border);
    color: var(--muted);
    font-size: 13px;
    padding: 6px 12px;
    border-radius: 999px;
  }
  .badge .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--flame); }
  main {
    width: 100%;
    max-width: 960px;
    padding: 8px 24px 40px;
    flex: 1;
  }
  h1 {
    font-size: clamp(20px, 3vw, 28px);
    font-weight: 650;
    margin: 8px 0 16px;
    letter-spacing: -0.02em;
  }
  .player {
    position: relative;
    width: 100%;
    background: #000;
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  }
  video {
    display: block;
    width: 100%;
    max-height: 70vh;
    background: #000;
  }
  footer {
    width: 100%;
    max-width: 960px;
    padding: 20px 24px 40px;
    color: var(--muted);
    font-size: 13px;
    text-align: center;
  }
  footer a { color: var(--flame); text-decoration: none; font-weight: 600; }
  footer a:hover { text-decoration: underline; }
  .cta {
    margin-top: 24px;
    text-align: center;
  }
  .cta a {
    display: inline-block;
    background: var(--flame);
    color: #fff;
    font-weight: 650;
    font-size: 14px;
    padding: 11px 20px;
    border-radius: 10px;
    text-decoration: none;
    box-shadow: 0 8px 24px ${FLAME}44;
  }
  .cta a:hover { filter: brightness(1.05); }
</style>
</head>
<body>
  <header>
    <a class="wordmark" href="https://getscenar.io"><span class="flame"></span>Scenario</a>
    <span class="badge"><span class="dot"></span>${viewLabel}</span>
  </header>
  <main>
    <h1>${safeTitle}</h1>
    <div class="player">
      <video src="${escapeHtml(videoSrc)}" controls autoplay muted playsinline preload="metadata"></video>
    </div>
    <div class="cta">
      <a href="https://getscenar.io">Generate demos with Scenario →</a>
    </div>
  </main>
  <footer>
    made with <strong>Scenario</strong> · <a href="https://getscenar.io">getscenar.io</a>
  </footer>
</body>
</html>`;
}

function notFoundPage(): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Not found · Scenario</title>
<style>
  body { margin:0; min-height:100vh; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:12px;
    background:#0b0b0d; color:#f4f4f5;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .flame { width:16px;height:16px;border-radius:5px;background:${FLAME};box-shadow:0 0 16px ${FLAME}88; }
  a { color:${FLAME}; text-decoration:none; font-weight:600; }
  p { color:#a1a1aa; }
</style></head>
<body>
  <span class="flame"></span>
  <h1>This Scenario isn't available</h1>
  <p>The link may be wrong or the video was removed.</p>
  <a href="https://getscenar.io">getscenar.io →</a>
</body></html>`;
}

/* -------------------------------------------------------------------------- */
/* Small utilities                                                            */
/* -------------------------------------------------------------------------- */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function shareBase(env: Env): string {
  return (env.SHARE_BASE_URL || "https://share.getscenar.io").replace(/\/+$/, "");
}

/** URL-safe base62-ish id (~10 chars). Collision-negligible for this scale. */
function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function sanitizeName(name: string | undefined): string {
  if (!name) return "";
  return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100);
}

/** Parse a single-range `Range: bytes=start-end` header into R2's range shape. */
function parseRange(header: string | null): R2Range | undefined {
  if (!header) return undefined;
  const m = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!m) return undefined;
  const startStr = m[1];
  const endStr = m[2];
  if (startStr === "" && endStr === "") return undefined;
  if (startStr === "") {
    // suffix range: last N bytes
    return { suffix: Number(endStr) };
  }
  const offset = Number(startStr);
  if (endStr === "") return { offset };
  return { offset, length: Number(endStr) - offset + 1 };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
