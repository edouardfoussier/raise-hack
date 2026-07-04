-- Scenario · share-page view analytics
-- D1 (SQLite) schema. Apply with:
--   wrangler d1 execute scenario-views --file=./schema.sql            (local)
--   wrangler d1 execute scenario-views --remote --file=./schema.sql  (production)

-- One row per page view of a share page.
-- Privacy: ip_hash is a SALTED SHA-256 hash of cf-connecting-ip, NEVER the raw IP.
CREATE TABLE IF NOT EXISTS views (
  video_id TEXT    NOT NULL,           -- id of the shared video (R2 object key stem)
  ts       INTEGER NOT NULL,           -- unix epoch milliseconds of the view
  ip_hash  TEXT    NOT NULL,           -- salted SHA-256 of the visitor IP (hex); used only for COUNT(DISTINCT)
  country  TEXT,                       -- ISO country from request.cf.country (may be null/"XX")
  ua       TEXT                        -- user-agent string (best-effort, may be null)
);

-- Optional: registry of uploaded videos so we can show a title on the share page.
CREATE TABLE IF NOT EXISTS videos (
  id         TEXT    PRIMARY KEY,       -- share id (also the R2 object key stem)
  title      TEXT    NOT NULL,          -- human title shown on the share page
  key        TEXT    NOT NULL,          -- R2 object key
  content_type TEXT  NOT NULL DEFAULT 'video/mp4',
  created_at INTEGER NOT NULL
);

-- Fast analytics: total views + recent-per-video lookups.
CREATE INDEX IF NOT EXISTS idx_views_video_ts ON views (video_id, ts DESC);
-- Fast COUNT(DISTINCT ip_hash) per video.
CREATE INDEX IF NOT EXISTS idx_views_video_iphash ON views (video_id, ip_hash);
