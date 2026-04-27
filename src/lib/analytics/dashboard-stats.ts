import { BOT_THRESHOLD_PER_DAY } from '@/consts';
import type {
  Totals,
  PathRow,
  DateTotalsRow,
  ReferrerRow,
  BrowserRow,
  CountryRow,
  DashboardData
} from '@/lib/types';
import { botFilterCte } from './bot-filter';

/**
 * Date filter on both the CTE and the outer query: raw events from
 * yesterday/the day before still live here (2-day cron buffer) and
 * would otherwise inflate the bot count.
 */
const LIVE_TODAY_TOTALS_SQL = `
  ${botFilterCte("date('now')")}
  SELECT COUNT(*) AS views,
         COUNT(DISTINCT visitor_id) AS visitors
  FROM pageview_events
  WHERE date(created_at) = date('now')
    AND visitor_id NOT IN (SELECT visitor_id FROM bots)
`;

const LIVE_TODAY_PAGES_SQL = `
  ${botFilterCte("date('now')")}
  SELECT path,
         COUNT(*) AS views,
         COUNT(DISTINCT visitor_id) AS visitors
  FROM pageview_events
  WHERE date(created_at) = date('now')
    AND visitor_id NOT IN (SELECT visitor_id FROM bots)
  GROUP BY path
  ORDER BY views DESC
  LIMIT 50
`;

/** Yesterday is still in pageview_events thanks to the 2-day cron buffer. */
const YESTERDAY_TOTALS_SQL = `
  ${botFilterCte("date('now', '-1 day')")}
  SELECT COUNT(*) AS views,
         COUNT(DISTINCT visitor_id) AS visitors
  FROM pageview_events
  WHERE date(created_at) = date('now', '-1 day')
    AND visitor_id NOT IN (SELECT visitor_id FROM bots)
`;

/**
 * Reads stats_daily_totals, NOT stats_daily — the latter is keyed by
 * (date, path) and SUM(visitors) across paths overcounts
 * (one visitor on three pages = visitors=3).
 */
const LAST_N_DAYS_SQL = (days: number) => `
  SELECT date, views, visitors
  FROM stats_daily_totals
  WHERE date >= date('now', '-${days} days')
  ORDER BY date ASC
`;

const TOP_PAGES_ALL_TIME_SQL = `
  SELECT path, views, visitors
  FROM stats_all_time
  ORDER BY views DESC
  LIMIT 20
`;

/**
 * visitors here is a sum of per-day per-path distinct counts —
 * overcounts true 30-day uniques. Accepted; see REQUIREMENTS.md.
 */
const TOP_PAGES_30D_SQL = `
  SELECT path,
         SUM(views) AS views,
         SUM(visitors) AS visitors
  FROM stats_daily
  WHERE date >= date('now', '-30 days')
  GROUP BY path
  ORDER BY views DESC
  LIMIT 20
`;

const TOP_REFERRERS_30D_SQL = `
  SELECT referrer, SUM(hits) AS hits
  FROM stats_daily_referrers
  WHERE date >= date('now', '-30 days')
  GROUP BY referrer
  ORDER BY hits DESC
  LIMIT 20
`;

const TOP_BROWSERS_30D_SQL = `
  SELECT browser, SUM(hits) AS hits
  FROM stats_daily_browsers
  WHERE date >= date('now', '-30 days')
  GROUP BY browser
  ORDER BY hits DESC
`;

const TOP_COUNTRIES_30D_SQL = `
  SELECT country, SUM(hits) AS hits
  FROM stats_daily_countries
  WHERE date >= date('now', '-30 days')
  GROUP BY country
  ORDER BY hits DESC
  LIMIT 20
`;

const TOTAL_7D_SQL = `
  SELECT COALESCE(SUM(views), 0) AS views,
         COALESCE(SUM(visitors), 0) AS visitors
  FROM stats_daily_totals
  WHERE date >= date('now', '-7 days')
`;

const TOTAL_30D_SQL = `
  SELECT COALESCE(SUM(views), 0) AS views,
         COALESCE(SUM(visitors), 0) AS visitors
  FROM stats_daily_totals
  WHERE date >= date('now', '-30 days')
`;

const TOTAL_ALL_TIME_SQL = `
  SELECT COALESCE(SUM(views), 0) AS views,
         COALESCE(SUM(visitors), 0) AS visitors
  FROM stats_all_time
`;

/**
 * Single D1 batch — 1 subrequest. Live + yesterday read raw events
 * (bots filtered in-query); everything else reads cron rollups.
 */
export async function getDashboardData(db: D1Database): Promise<DashboardData> {
  const results = await db.batch([
    db.prepare(LIVE_TODAY_TOTALS_SQL).bind(BOT_THRESHOLD_PER_DAY),
    db.prepare(LIVE_TODAY_PAGES_SQL).bind(BOT_THRESHOLD_PER_DAY),
    db.prepare(YESTERDAY_TOTALS_SQL).bind(BOT_THRESHOLD_PER_DAY),
    db.prepare(LAST_N_DAYS_SQL(7)),
    db.prepare(LAST_N_DAYS_SQL(30)),
    db.prepare(TOP_PAGES_ALL_TIME_SQL),
    db.prepare(TOP_PAGES_30D_SQL),
    db.prepare(TOP_REFERRERS_30D_SQL),
    db.prepare(TOP_BROWSERS_30D_SQL),
    db.prepare(TOP_COUNTRIES_30D_SQL),
    db.prepare(TOTAL_7D_SQL),
    db.prepare(TOTAL_30D_SQL),
    db.prepare(TOTAL_ALL_TIME_SQL)
  ]);

  const [
    liveTodayTotalsR,
    liveTodayPagesR,
    yesterdayR,
    last7R,
    last30R,
    topPagesAllTimeR,
    topPages30dR,
    topReferrersR,
    topBrowsersR,
    topCountriesR,
    total7R,
    total30R,
    totalAllTimeR
  ] = results;

  return {
    liveTodayTotals: firstRowOrZeros(liveTodayTotalsR.results as Totals[]),
    liveTodayPages: (liveTodayPagesR.results ?? []) as PathRow[],

    yesterday: firstRowOrZeros(yesterdayR.results as Totals[]),

    last7Days: (last7R.results ?? []) as DateTotalsRow[],
    last30Days: (last30R.results ?? []) as DateTotalsRow[],

    topPagesAllTime: (topPagesAllTimeR.results ?? []) as PathRow[],
    topPages30d: (topPages30dR.results ?? []) as PathRow[],

    topReferrers30d: (topReferrersR.results ?? []) as ReferrerRow[],
    topBrowsers30d: (topBrowsersR.results ?? []) as BrowserRow[],
    topCountries30d: (topCountriesR.results ?? []) as CountryRow[],

    total7Days: firstRowOrZeros(total7R.results as Totals[]),
    total30Days: firstRowOrZeros(total30R.results as Totals[]),
    totalAllTime: firstRowOrZeros(totalAllTimeR.results as Totals[])
  };
}

function firstRowOrZeros(rows: Totals[] | undefined): Totals {
  return rows?.[0] ?? { views: 0, visitors: 0 };
}
