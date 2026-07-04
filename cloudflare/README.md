# Scenario — Share Page + Video Storage + View Analytics

A single [Cloudflare Worker](https://developers.cloudflare.com/workers/) that powers the
**public share link** for [Scenario](https://getscenar.io) demos:

- a clean, dark-theme **share page** (`/v/:id`) that streams the demo video from **R2**,
- a **video upload** API (`POST /api/videos`) that stores files in R2,
- **view analytics** in **D1** (privacy-preserving — only a salted hash of the IP is stored).

This is the built-in **user-acquisition loop** from the product vision: every shared demo
carries a "Generate demos with Scenario →" CTA back to `getscenar.io`.

---

## Routes

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| `GET`  | `/v/:id`                      | Public share page. Dark theme, flame `#FF5A1F` accent, "Scenario" wordmark, `<video>` player, view-count badge, footer + CTA. Records a view on each load (fire-and-forget). |
| `POST` | `/api/videos`                 | Multipart upload (`file` field, optional `title`). Stores the file in R2, registers it in D1. Returns `{ id, shareUrl }`. |
| `GET`  | `/api/videos/:id/analytics`   | Returns `{ views, uniqueVisitors, recent: [{ ts, country }] }`. |
| `GET`  | `/r2/:id`                     | Raw video bytes for the `<video>` element. Supports HTTP `Range` (seeking / progressive playback). |
| `GET`  | `/` or `/health`              | Health check `{ ok: true }`. |

`:id` is a URL-safe ~10-char id minted at upload time (also the R2 key prefix).

---

## Bindings & secrets

Declared in [`wrangler.toml`](./wrangler.toml) — **not** provisioned by it. Create the
resources first (below), then the Worker uses:

| Binding      | Type              | Purpose |
|--------------|-------------------|---------|
| `VIDEOS`     | R2 bucket         | Stores the video files (`scenario-videos`). |
| `DB`         | D1 database       | `views` + `videos` tables (`scenario-views`). |
| `IP_SALT`    | Secret            | Salt for the SHA-256 IP hash. Set via `wrangler secret put IP_SALT`. |
| `SHARE_BASE_URL` | Var (plaintext) | Base URL used to build `shareUrl` (default `https://share.getscenar.io`). |
| `ANALYTICS`  | Analytics Engine  | *Optional*, off by default. Richer analytics — see below. |

### Privacy

We **never** store or log a raw IP. On each view we compute
`SHA-256(IP_SALT + ":" + cf-connecting-ip)` and store only that hex digest as `ip_hash`.
Unique visitors are `COUNT(DISTINCT ip_hash)`. Country comes from `request.cf.country`
(coarse, no PII). If `IP_SALT` is rotated, historical hashes simply stop matching new ones
(no data leak). This keeps the analytics GDPR-friendly by design.

---

## Data model

See [`schema.sql`](./schema.sql).

```sql
CREATE TABLE views (
  video_id TEXT NOT NULL,   -- shared video id
  ts       INTEGER NOT NULL,-- unix epoch ms
  ip_hash  TEXT NOT NULL,   -- salted SHA-256 of the IP (NOT the raw IP)
  country  TEXT,            -- request.cf.country
  ua       TEXT             -- user-agent (best effort)
);
CREATE TABLE videos (       -- registry so the share page can show a title
  id TEXT PRIMARY KEY, title TEXT NOT NULL, key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'video/mp4', created_at INTEGER NOT NULL
);
```

---

## Deploy (exact steps)

Prereqs: a Cloudflare account with `getscenar.io` on it, and Wrangler authenticated
(`npx wrangler login`).

```bash
cd cloudflare
npm install
```

### 1. Create the R2 bucket

```bash
npx wrangler r2 bucket create scenario-videos
```

### 2. Create the D1 database and apply the schema

```bash
npx wrangler d1 create scenario-views
```

Copy the printed `database_id` into `wrangler.toml` (replace `REPLACE_WITH_DATABASE_ID`).
Then apply the schema — first locally (for `wrangler dev`), then to production:

```bash
# local (used by `wrangler dev`)
npx wrangler d1 execute scenario-views --file=./schema.sql

# production (the real D1 database)
npx wrangler d1 execute scenario-views --remote --file=./schema.sql
```

### 3. Set the IP-hash salt secret

```bash
npx wrangler secret put IP_SALT
# paste a long random string when prompted, e.g. `openssl rand -hex 32`
```

### 4. Deploy

```bash
npx wrangler deploy
```

### 5. Attach the `share.getscenar.io` custom domain

Because `getscenar.io` is already on Cloudflare, Wrangler can manage the DNS record and
certificate for you. Two options:

**A. Declare it in `wrangler.toml`** (recommended) — uncomment:

```toml
[[routes]]
pattern = "share.getscenar.io"
custom_domain = true
```

then `npx wrangler deploy` again. Wrangler creates the `share` DNS record + TLS cert on the
`getscenar.io` zone and routes it to this Worker.

**B. Dashboard** — Workers & Pages → `scenario-share` → **Settings → Domains & Routes →
Add → Custom Domain** → enter `share.getscenar.io`.

Either way, set `SHARE_BASE_URL="https://share.getscenar.io"` (already the default in
`wrangler.toml`) so `POST /api/videos` returns share URLs on that host.

> Alternatively, to serve share pages on the apex path `getscenar.io/v/*`, use the
> `zone_name` route option shown (commented) in `wrangler.toml` instead of a custom domain.

---

## Try it

```bash
# upload
curl -F "file=@demo.mp4" -F "title=Checkout flow — before/after" \
  https://share.getscenar.io/api/videos
# → { "id": "aB3xY7q0Zk", "shareUrl": "https://share.getscenar.io/v/aB3xY7q0Zk" }

# open the share page
open https://share.getscenar.io/v/aB3xY7q0Zk

# analytics
curl https://share.getscenar.io/api/videos/aB3xY7q0Zk/analytics
# → { "views": 12, "uniqueVisitors": 5, "recent": [ { "ts": 1720000000000, "country": "FR" }, ... ] }
```

Local development:

```bash
cp .dev.vars.example .dev.vars     # sets a throwaway IP_SALT
npx wrangler dev                    # uses local R2 + local D1 (apply schema locally first)
```

---

## Optional: Analytics Engine (richer, sampled analytics)

D1 gives exact counts and is perfect for view/unique/recent. For higher-volume, dimensional
analytics (per-country/per-day time series, high-cardinality slicing) without managing rows,
Cloudflare **[Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)**
is a better fit — unlimited-cardinality, write-only, queryable via SQL API/GraphQL, sampled at
scale.

To enable, uncomment the `analytics_engine_datasets` binding in `wrangler.toml`. The Worker
already writes a data point per view when `env.ANALYTICS` is present:

```ts
env.ANALYTICS.writeDataPoint({
  blobs: [videoId, country, userAgent],
  indexes: [videoId],
  doubles: [1],
});
```

You can then query it via the
[Analytics Engine SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/).
Keep D1 for the exact view badge + unique visitors; use Analytics Engine for dashboards.

---

## Verify without deploying

No Cloudflare credentials required:

```bash
npm install
npx wrangler deploy --dry-run --outdir dist   # bundles + type-aware validation
# or
npx tsc --noEmit                               # pure type check
```
