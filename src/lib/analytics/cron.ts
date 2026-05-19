import type { D1Database } from '@cloudflare/workers-types';
import {
  BOT_BURST_HITS,
  BOT_BURST_WINDOW_SECONDS,
  BOT_THRESHOLD_PER_DAY,
  MAX_DAYS_PER_RUN,
  RAW_EVENT_RETENTION_DAYS
} from '@/consts';
import { botFilterCte } from './bot-filter';

/**
 * Run one daily aggregation pass.
 *
 * Three steps:
 *   1. Find dates ≥ RAW_EVENT_RETENTION_DAYS old (oldest first, capped
 *      at MAX_DAYS_PER_RUN).
 *   2. For each date, one atomic db.batch:
 *      rollups + DELETE FROM pageview_events for that date.
 *   3. If anything was processed, refresh stats_all_time.
 *
 * Aggregation and the raw-events delete are coupled in the same batch:
 * either both commit or both roll back. A long outage just grows
 * pageview_events; once cron resumes, the backlog drains at
 * MAX_DAYS_PER_RUN dates per nightly run. No silent data loss.
 *
 * Partial failure: stop on the first aggregateDate error, but still
 * refresh stats_all_time for the dates that did commit, then re-throw
 * so CF logs the cause. The next run resumes from the failed date
 * (idempotent — INSERT OR REPLACE + scoped DELETEs).
 *
 * Idempotent: a run with no eligible dates is a no-op. Re-running on
 * the same DB state produces the same DB state.
 */
export async function handleCron(db: D1Database): Promise<void> {
  const dates = await findDatesToProcess(db);

  let processed = 0;
  let firstError: unknown;
  for (const date of dates) {
    try {
      await aggregateDate(db, date);
      processed++;
    } catch (err) {
      firstError = err;
      break;
    }
  }

  if (processed > 0) {
    try {
      await refreshAllTime(db);
    } catch (err) {
      // Prefer the aggregateDate error — it's the root cause of the backlog.
      if (!firstError) firstError = err;
    }
  }

  if (firstError) throw firstError;
}

// ─── Step 1: find dates ─────────────────────────────────────────────────

/**
 * Return the oldest dates whose events are at least RAW_EVENT_RETENTION_DAYS
 * old, capped at MAX_DAYS_PER_RUN. Sorted ascending so we always process
 * oldest first — important when a backlog spans more than one cron run.
 *
 * No JOIN with stats_daily is needed: because aggregation and raw delete
 * run together, "events still present in pageview_events" is exactly
 * "not yet aggregated". This is what makes the algorithm robust against
 * bot-only days (where rollup INSERTs match 0 rows but the DELETE still
 * runs).
 */
async function findDatesToProcess(db: D1Database): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT DISTINCT date(created_at) AS d
       FROM pageview_events
       WHERE date(created_at) <= date('now', ?)
       ORDER BY d ASC
         LIMIT ?`
    )
    .bind(`-${RAW_EVENT_RETENTION_DAYS} days`, MAX_DAYS_PER_RUN)
    .all<{ d: string }>();

  return result.results.map(r => r.d);
}

// ─── Step 2: aggregate one date ─────────────────────────────────────────

/**
 * One db.batch that:
 *   - rolls up stats_daily, stats_daily_totals, stats_daily_referrers,
 *     stats_daily_browsers, stats_daily_countries (each with bot-filter CTE);
 *   - rebuilds stats_monthly for the affected month from stats_daily;
 *   - DELETEs raw events for this date.
 *
 * Atomic — aggregation and raw cleanup commit together or roll back together.
 *
 * stats_daily_totals is computed directly from raw events (not summed
 * from stats_daily), because COUNT(DISTINCT visitor_id) per (date, path)
 * cannot be added across paths to recover a per-date distinct count.
 */
async function aggregateDate(db: D1Database, date: string): Promise<void> {
  const month = date.slice(0, 7); // 'YYYY-MM'

  // CTE used by every rollup. Repeated per query because batch
  // statements don't share scope.
  const botCte = botFilterCte('?');

  // Each rollup binds: date (CTE), threshold, date (CTE), window, date (CTE),
  // hits, date (outer WHERE). Identical for every per-date statement below.
  const bindDate = (stmt: D1PreparedStatement) =>
    stmt.bind(
      date,
      BOT_THRESHOLD_PER_DAY,
      date,
      BOT_BURST_WINDOW_SECONDS,
      date,
      BOT_BURST_HITS,
      date
    );

  // hits-style breakdown: GROUP BY a single field, COUNT(*) → table(date, field, hits).
  const breakdown = (table: string, field: string) =>
    bindDate(
      db.prepare(
        `${botCte}
        INSERT OR REPLACE INTO ${table} (date, ${field}, hits)
        SELECT date(created_at), ${field}, COUNT(*)
        FROM pageview_events
        WHERE date(created_at) = ?
          AND ${field} IS NOT NULL
          AND visitor_id NOT IN (SELECT visitor_id FROM bots)
        GROUP BY date(created_at), ${field}`
      )
    );

  await db.batch([
    // stats_daily — per (date, path)
    bindDate(
      db.prepare(
        `${botCte}
        INSERT OR REPLACE INTO stats_daily (date, path, views, visitors)
        SELECT date(created_at), path,
          COUNT(*),
          COUNT(DISTINCT visitor_id)
        FROM pageview_events
        WHERE date(created_at) = ?
          AND visitor_id NOT IN (SELECT visitor_id FROM bots)
        GROUP BY date(created_at), path`
      )
    ),

    // stats_daily_totals — per date (correct distinct count across all paths)
    bindDate(
      db.prepare(
        `${botCte}
        INSERT OR REPLACE INTO stats_daily_totals (date, views, visitors)
        SELECT date(created_at),
          COUNT(*),
          COUNT(DISTINCT visitor_id)
        FROM pageview_events
        WHERE date(created_at) = ?
          AND visitor_id NOT IN (SELECT visitor_id FROM bots)
        GROUP BY date(created_at)`
      )
    ),

    breakdown('stats_daily_referrers', 'referrer'),
    breakdown('stats_daily_browsers', 'browser'),
    breakdown('stats_daily_countries', 'country'),

    // stats_monthly — wipe and recompute the affected month from stats_daily.
    // DELETE first so paths that disappeared from the new aggregation
    // (e.g. went bot-only) don't leave stale rows behind.
    db.prepare(`DELETE FROM stats_monthly WHERE month = ?`).bind(month),
    db
      .prepare(
        `INSERT INTO stats_monthly (month, path, views, visitors)
         SELECT ?, path, SUM(views), SUM(visitors)
         FROM stats_daily
         WHERE date LIKE ?
         GROUP BY path`
      )
      .bind(month, `${month}-%`),

    // Raw events for this date are now fully aggregated → delete.
    // Atomic with the rollups above. Even on a bot-only day where the
    // rollup INSERTs above match 0 rows, this DELETE still runs.
    db.prepare(`DELETE FROM pageview_events WHERE date(created_at) = ?`).bind(date)
  ]);
}

// ─── Step 3: refresh stats_all_time ─────────────────────────────────────

/**
 * Wiped and re-summed from stats_monthly. Run only when at least one
 * date was aggregated in this invocation (otherwise stats_monthly didn't
 * change, so all_time wouldn't either).
 *
 * DELETE + INSERT in a single batch so the table is never observed
 * empty mid-run.
 */
async function refreshAllTime(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(`DELETE FROM stats_all_time`),
    db.prepare(
      `INSERT INTO stats_all_time (path, views, visitors)
       SELECT path, SUM(views), SUM(visitors)
       FROM stats_monthly
       GROUP BY path`
    )
  ]);
}
