# Analytics

Privacy-first, server-side pageview tracking on Cloudflare Workers + D1.
No cookies, no client-side JavaScript, no third-party services. Runs on
the Cloudflare Workers Free plan.

## Architecture

```
Request
  ↓
guard middleware    → 404 on reconnaissance paths
  ↓
track middleware    → await next() → 200 HTML? → ctx.waitUntil(trackPageview(...))
  ↓
response returned   → user is not blocked by the DB write

[ Cloudflare Cron Trigger — daily at 00:30 UTC ]
scheduled() → handleCron(db)
  → find dates ≥ RAW_EVENT_RETENTION_DAYS old
  → for each: one atomic batch — rollups + DELETE raw events for that date
  → refresh stats_all_time (only if anything was processed)

[ on /stats request ]
getStatsPageData(db) → 13-query batch → render
```

## Design

- Raw events fold into rollups; raw rows are deleted in the same batch
  that aggregates their date.
- Bots (visitors with > `BOT_THRESHOLD_PER_DAY` events on one day) are
  filtered out at aggregation via a CTE — never at write time.
- The dashboard reads precomputed data, except "Live (today)" and
  "Yesterday", which read raw events directly.
- Idempotent, atomic per date, self-recovering after outages.
- DISTINCT visitors are computed per-day; summing across days is an
  over-count (one visitor on 3 days counts as 3). `visitor_id` rotates
  every UTC midnight — cross-day tracking is intentionally unsupported.

## Schema

Single migration: `migrations/0001_analytics.sql`.

### `pageview_events` — raw events

One row per tracked request. Deleted in the same batch that aggregates
its date.

| Column       | Type         | Notes                             |
| ------------ | ------------ | --------------------------------- |
| `id`         | INTEGER      | autoincrement PK                  |
| `visitor_id` | TEXT         | 16-hex truncated SHA-256          |
| `path`       | TEXT         | normalised lowercase path         |
| `referrer`   | TEXT \| NULL | external hostname only            |
| `country`    | TEXT \| NULL | from `cf-ipcountry` header        |
| `browser`    | TEXT \| NULL | from `ua-parser-js`               |
| `os`         | TEXT \| NULL | from `ua-parser-js`               |
| `device`     | TEXT         | `desktop` \| `mobile` \| `tablet` |
| `created_at` | TEXT         | UTC ISO timestamp (set in code)   |

Indexes: `(created_at)`, `(visitor_id, created_at)`, `(path, created_at)`.

### Rollup tables

| Table                   | PK                 | Stored                                   |
| ----------------------- | ------------------ | ---------------------------------------- |
| `stats_daily`           | `(date, path)`     | `views`, `visitors` (DISTINCT per path)  |
| `stats_daily_totals`    | `date`             | `views`, `visitors` (DISTINCT per date)  |
| `stats_daily_referrers` | `(date, referrer)` | `hits`                                   |
| `stats_daily_browsers`  | `(date, browser)`  | `hits`                                   |
| `stats_daily_countries` | `(date, country)`  | `hits`                                   |
| `stats_monthly`         | `(month, path)`    | sum of `stats_daily` for that month      |
| `stats_all_time`        | `path`             | sum of `stats_monthly` across all months |

`stats_daily.visitors` is per-(date, path) — never SUM across paths;
use `stats_daily_totals` for daily totals. `stats_monthly.visitors`
and `stats_all_time.visitors` are sums of per-day-per-path counts and
overestimate true unique visitors over multi-day windows.

## Request-time tracking

### `guard` middleware

Returns `404` immediately for reconnaissance paths so they never reach
Astro's router or the analytics code:

- Extensions: `.php`, `.asp`, `.aspx`, `.jsp`, `.cgi`, `.bak`, `.old`,
  `.sql`, `.log`, `.htaccess`, `.ini`, `.config`
- Path prefixes: `/wp-`, `/wordpress`, `/admin`, `/phpmyadmin`,
  `/.env`, `/.git`, `/.svn`, `/.aws`, `/setup`, `/install`

### `track` middleware

Awaits `next()` first, then schedules the insert via
`ctx.waitUntil(...)` — the response is not blocked by the DB write.
The request is dropped (no DB write) if any of the following hold:

- Response status ≠ 200, or response `content-type` is not `text/html`
  (`shouldTrackResponse` in `src/lib/analytics/should-track.ts`). This
  is the primary filter: it rejects 404s (bot probes for non-existent
  paths), redirects, and non-HTML routes (`robots.txt`, RSS, sitemap,
  JSON, static assets) without any path allowlist.
- Path starts with `/stats`, `/_`, or `/api/` (own admin/internal HTML).
- Header `purpose: prefetch` or `sec-purpose: prefetch` present.
- User-Agent is empty or matches the `isbot` library.

Otherwise `trackPageview` computes the visitor ID, parses the UA,
normalises the referrer, and `INSERT`s into `pageview_events`.

### Visitor ID

```
visitor_id = SHA-256( anonymised_ip | user_agent | YYYY-MM-DD | ANALYTICS_SALT )
             truncated to 16 hex chars (64 bits)
```

The date component **rotates the ID every UTC midnight** — same person
on the same network gets a different ID tomorrow. IP is anonymised
before hashing (`src/lib/analytics/ip.ts`): IPv4 → /24 (last octet
zeroed), IPv6 → /64 (last four hextets zeroed). Raw IP is never stored.

## Cron

Cloudflare Cron Trigger, `30 0 * * *` (daily at 00:30 UTC). Defined in
`wrangler.json`. The `scheduled()` handler in `src/worker.ts` calls
`handleCron(db)` from `src/lib/analytics/cron.ts`.

`handleCron` runs three steps.

### 1. Find dates to process

```sql
SELECT DISTINCT date(created_at) AS d
FROM pageview_events
WHERE date(created_at) <= date('now', '-2 days')
ORDER BY d ASC
LIMIT 10
```

The 2-day buffer (`RAW_EVENT_RETENTION_DAYS`) gives raw events a minimum
lifetime before processing. Capped at `MAX_DAYS_PER_RUN = 10` to bound
subrequest usage.

### 2. For each date — one atomic batch

For every date returned by Step 1, one `db.batch` runs all of:

- `INSERT OR REPLACE INTO stats_daily` — `(date, path, views, visitors)`
- `INSERT OR REPLACE INTO stats_daily_totals` — `(date, views, visitors)`
- `INSERT OR REPLACE INTO stats_daily_referrers` (referrer IS NOT NULL)
- `INSERT OR REPLACE INTO stats_daily_browsers` (browser IS NOT NULL)
- `INSERT OR REPLACE INTO stats_daily_countries` (country IS NOT NULL)
- `DELETE FROM stats_monthly WHERE month = ?` — wipe stale rows
- `INSERT INTO stats_monthly` — recompute month from `stats_daily`
- `DELETE FROM pageview_events WHERE date(created_at) = ?` — remove raw events

The whole batch is atomic: aggregation and the raw delete commit
together or roll back together. `stats_daily_totals` is computed
directly from raw events because COUNT(DISTINCT visitor_id) per
(date, path) cannot be summed across paths to recover a per-date
distinct count.

Each rollup query carries its own bot-filtering CTE:

```sql
WITH bots AS (
  SELECT visitor_id FROM pageview_events
  WHERE date(created_at) = ?
  GROUP BY visitor_id
  HAVING COUNT(*) > 50
)
INSERT OR REPLACE INTO stats_daily ...
WHERE date(created_at) = ?
  AND visitor_id NOT IN (SELECT visitor_id FROM bots)
```

The threshold (`BOT_THRESHOLD_PER_DAY = 50`) is shared with the
dashboard Live and Yesterday queries.

### 3. Refresh `stats_all_time`

Runs only if Step 1 returned at least one date:

```sql
DELETE FROM stats_all_time;
INSERT INTO stats_all_time
SELECT path, SUM(views), SUM(visitors)
FROM stats_monthly GROUP BY path;
```

### Properties

- **Idempotent.** A run with no eligible dates is a no-op. Every write
  uses `INSERT OR REPLACE` or is preceded by a scoped `DELETE`.
- **Atomic per date, no silent data loss.** Aggregation and raw cleanup
  commit together or roll back together. A crash leaves earlier dates
  fully committed and later dates untouched (raw still in the table) —
  the next run resumes from there. A long outage just grows
  `pageview_events`; cron drains it at `MAX_DAYS_PER_RUN` per run.
- **Bot-only days** are handled implicitly: rollup INSERTs match 0 rows,
  but the in-batch `DELETE` still removes the raw events.
- **Subrequest budget.** Each `db.batch` is one D1 subrequest regardless
  of statement count. Per run: 1 (find-dates) + ≤10 (per-date batches) +
  1 (`stats_all_time`) ≤ 12. Free plan limit is 50 per invocation.

## Dashboard

`/stats` (`src/pages/stats.astro`) calls `getStatsPageData(db)` from
`src/lib/analytics/stats-page.ts`, which delegates to
`getDashboardData(db)` in `src/lib/analytics/dashboard-stats.ts` and runs one
`db.batch` of 13 queries.

| Section                    | Source                                  | Bot handling             |
| -------------------------- | --------------------------------------- | ------------------------ |
| Live (today)               | `pageview_events`                       | in-query CTE             |
| Yesterday                  | `pageview_events`                       | in-query CTE             |
| Last 7 days                | `stats_daily_totals`                    | already excluded by cron |
| Last 30 days               | `stats_daily_totals`                    | already excluded by cron |
| Top pages (all time)       | `stats_all_time`                        | already excluded by cron |
| Top pages (30 days)        | `stats_daily`                           | already excluded by cron |
| Referrers (30 days)        | `stats_daily_referrers`                 | already excluded by cron |
| Browsers (30 days)         | `stats_daily_browsers`                  | already excluded by cron |
| Countries (30 days)        | `stats_daily_countries`                 | already excluded by cron |
| Headline totals (7/30/all) | `stats_daily_totals` / `stats_all_time` | already excluded by cron |

Live and Yesterday read raw events because their dates fall within the
2-day buffer and aren't aggregated yet; their CTEs are scoped to today /
yesterday respectively. Everything else reads rollups, which therefore
lag by ~2 days.

## Examples

### Counting `visitors`

Raw: `A:/`, `A:/about`, `B:/`.

```
stats_daily        | (D, /)      views=2, visitors=2
                   | (D, /about) views=1, visitors=1
stats_daily_totals | D           views=3, visitors=2
```

`SUM(stats_daily.visitors)` = 3 (over-count). The dashboard reads
`stats_daily_totals` = 2.

### Bot day

`BOT:/` × 100, `A:/` × 1. The CTE filters out BOT (100 > 50).

```
stats_daily | (D, /) views=1, visitors=1
```

BOT's raw events are deleted in the same batch.

### 7-day backlog

Today is 2026-04-26; `pageview_events` holds events from 18-04 through
25-04. Find-dates → `[18-04, …, 24-04]` (25-04 is buffered out). Each
date is processed in its own batch; afterwards `pageview_events` holds
only 25-04 and 26-04. A backlog >10 days drains over `ceil(backlog / 10)`
nightly runs.

## Privacy

- No cookies, no localStorage, no client-side JavaScript, no fingerprinting libs.
- Raw IP anonymised before hashing, never stored.
- Visitor hash rotates daily (date in the input) → no cross-day tracking.
- 64-bit truncation + server-only `ANALYTICS_SALT` → not reversible to an IP.
- Raw events deleted together with aggregation — at least
  `RAW_EVENT_RETENTION_DAYS` after creation.

## Constants

Defined in `src/consts.ts`.

| Name                       | Value | Used in                                    |
| -------------------------- | ----- | ------------------------------------------ |
| `BOT_THRESHOLD_PER_DAY`    | 50    | cron CTEs, dashboard Live + Yesterday CTEs |
| `MAX_DAYS_PER_RUN`         | 10    | cron find-dates LIMIT                      |
| `RAW_EVENT_RETENTION_DAYS` | 2     | buffer in find-dates                       |

## Required environment

| Binding / variable | Where                             | Purpose                              |
| ------------------ | --------------------------------- | ------------------------------------ |
| `DB`               | `wrangler.json` (`d1_databases`)  | D1 database binding                  |
| `ANALYTICS_SALT`   | secret (Cloudflare + `.dev.vars`) | server-only salt for visitor hashing |

## Operations

### Inspecting state

```bash
# Eligible dates left unprocessed (should be 0 right after a successful run,
# unless the backlog exceeded MAX_DAYS_PER_RUN)
wrangler d1 execute <DB> --remote --command \
  "SELECT COUNT(*) FROM pageview_events WHERE date(created_at) <= date('now', '-2 days')"

# Which dates are aggregated
wrangler d1 execute <DB> --remote --command \
  "SELECT date FROM stats_daily_totals ORDER BY date DESC LIMIT 10"

# Watch the cron fire
wrangler tail
```

### One-time cleanup of bot junk paths

The `200 HTML only` filter rejects bot probes going forward. Any junk
paths recorded before the filter existed (e.g. `/backend/.env`, `/env`,
`/security.txt`, `/sitemap.xml.gz`) are still in `pageview_events`
until cron drains them — and low-volume probes (≤ `BOT_THRESHOLD_PER_DAY`
hits/day) flow into the rollups instead of being filtered out.

Drain them once with:

```bash
wrangler d1 execute blog --remote --command "
DELETE FROM pageview_events
WHERE path NOT IN ('/', '/about', '/posts')
  AND path NOT LIKE '/posts/%';
"
```

Update the path list above when you add a new top-level page.

### Manual cron run

Cloudflare dashboard → Workers & Pages → your worker → Triggers →
"Trigger Now". Useful for backfilling without waiting for 00:30 UTC,
or for draining a long backlog (one tick processes ≤ `MAX_DAYS_PER_RUN`
dates).

### Tuning

Constants can be adjusted in `src/consts.ts`:

- Lower `BOT_THRESHOLD_PER_DAY` if real bots slip through.
- Raise `MAX_DAYS_PER_RUN` if you upgrade to Workers Paid (1000
  subrequests instead of 50) — faster recovery from long outages.
- Raise `RAW_EVENT_RETENTION_DAYS` for a wider debugging window at the
  cost of a larger raw table.
