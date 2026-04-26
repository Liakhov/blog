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

ALTER TABLE pageview_events DROP COLUMN is_bot;

DROP TABLE IF EXISTS bot_signatures;
