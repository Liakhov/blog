-- Migration 0002: simplify schema after switching to in-query bot detection.
--
-- The is_bot column on pageview_events and the bot_signatures table are
-- no longer needed:
--   * Bot detection now happens via a CTE inside each rollup query (cron)
--     and inside the Live dashboard query.
--   * The visitor_id rotates every UTC midnight, so persisting a list of
--     bot visitor_ids across days has no value.
--
-- Safe to run on a database that already contains data — the existing
-- pageview_events rows lose only the always-zero is_bot column.

-- Drop the index that references is_bot before the column itself —
-- SQLite refuses to drop a column that's part of any index.
DROP INDEX IF EXISTS idx_events_path;

ALTER TABLE pageview_events DROP COLUMN is_bot;

-- Recreate the path index without is_bot. Still useful for top-pages
-- queries that scan a path over a date range.
CREATE INDEX IF NOT EXISTS idx_events_path ON pageview_events(path, created_at);

DROP TABLE IF EXISTS bot_signatures;
