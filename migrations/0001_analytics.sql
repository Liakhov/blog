-- Initial analytics schema for Cloudflare D1.
--
-- Privacy-first server-side pageview tracking. Raw events are deleted
-- in the same batch that aggregates their date (≥2 days after creation).

-- ─── Raw events ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pageview_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT    NOT NULL,
  path       TEXT    NOT NULL,
  referrer   TEXT,
  country    TEXT,
  browser    TEXT,
  os         TEXT,
  device     TEXT    NOT NULL,
  created_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_created ON pageview_events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_visitor ON pageview_events(visitor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_path    ON pageview_events(path, created_at);

-- ─── Daily rollups ──────────────────────────────────────────────────────

-- Per-(date, path): views and DISTINCT visitors per path on a given day.
-- Cannot be SUMmed across paths to get a daily total — use stats_daily_totals.
CREATE TABLE IF NOT EXISTS stats_daily (
  date     TEXT NOT NULL,
  path     TEXT NOT NULL,
  views    INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, path)
);

-- Per-date: views and DISTINCT visitors across all paths.
-- Source of truth for "Last 7/30 days" dashboard charts.
CREATE TABLE IF NOT EXISTS stats_daily_totals (
  date     TEXT PRIMARY KEY,
  views    INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stats_daily_referrers (
  date     TEXT NOT NULL,
  referrer TEXT NOT NULL,
  hits     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, referrer)
);

CREATE TABLE IF NOT EXISTS stats_daily_browsers (
  date    TEXT NOT NULL,
  browser TEXT NOT NULL,
  hits    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, browser)
);

CREATE TABLE IF NOT EXISTS stats_daily_countries (
  date    TEXT NOT NULL,
  country TEXT NOT NULL,
  hits    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, country)
);

-- ─── Monthly + all-time rollups ─────────────────────────────────────────

-- Per-month: sums of stats_daily values for that month.
-- visitors is a sum of per-day-per-path counts; overestimates true monthly uniques.
CREATE TABLE IF NOT EXISTS stats_monthly (
  month    TEXT NOT NULL,
  path     TEXT NOT NULL,
  views    INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (month, path)
);

-- Per-path: sums of stats_monthly across all months.
-- Same overcount caveat as stats_monthly.
CREATE TABLE IF NOT EXISTS stats_all_time (
  path     TEXT PRIMARY KEY,
  views    INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0
);
