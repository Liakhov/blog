export const SITE = {
  website: 'https://liakhov.dev',
  author: 'Yurii Liakhov',
  profile: 'https://github.com/Liakhov',
  desc: 'Personal blog by Yurii Liakhov — software engineering, AI, and side projects.',
  title: 'Yurii Liakhov',
  ogImage: '',
  dir: 'ltr',
  lang: 'en',
  timezone: 'Europe/Kyiv'
} as const;

export const SOCIALS = [
  {
    name: 'GitHub',
    href: 'https://github.com/Liakhov'
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/in/yuriiliakhov'
  }
] as const;

/**
 * Visitors with > this many events in one UTC day are excluded from rollups
 * and from the dashboard's Live section. Shared by cron CTE and Live CTE
 * so both agree on what "bot" means.
 */
export const BOT_THRESHOLD_PER_DAY = 50;

/**
 * Max dates per cron run. One run uses ≤ 12 D1 subrequests for a 10-day
 * backlog (1 find-dates + N per-date batches + 1 stats_all_time refresh) —
 * well under the Free plan's 50/invocation limit.
 *
 * Larger backlogs drain on subsequent runs, oldest first. Raw events
 * survive until their date is processed, so long outages just grow
 * pageview_events without losing data.
 */
export const MAX_DAYS_PER_RUN = 10;

/**
 * Minimum age (days) before a date is eligible for processing. Buffers
 * the live "today" view from the rollup-backed sections. Aggregation and
 * the raw-events DELETE run in the same batch, so raw events live at
 * least this long.
 */
export const RAW_EVENT_RETENTION_DAYS = 2;
