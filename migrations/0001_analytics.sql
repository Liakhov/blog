CREATE TABLE IF NOT EXISTS pageview_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT    NOT NULL,
  path       TEXT    NOT NULL,
  referrer   TEXT,
  country    TEXT,
  browser    TEXT,
  os         TEXT,
  device     TEXT,
  is_bot     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_events_created ON pageview_events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_visitor ON pageview_events(visitor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_path    ON pageview_events(path, is_bot, created_at);

CREATE TABLE IF NOT EXISTS stats_daily (
  date     TEXT NOT NULL,
  path     TEXT NOT NULL,
  views    INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, path)
);

CREATE TABLE IF NOT EXISTS stats_monthly (
  month    TEXT NOT NULL,
  path     TEXT NOT NULL,
  views    INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (month, path)
);

CREATE TABLE IF NOT EXISTS stats_all_time (
  path     TEXT PRIMARY KEY,
  views    INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bot_signatures (
  visitor_id TEXT PRIMARY KEY,
  reason     TEXT NOT NULL,
  flagged_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
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