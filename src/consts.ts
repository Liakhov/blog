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

// Bot filter: drop visitors over this many events per UTC day.
export const BOT_THRESHOLD_PER_DAY = 50;

// Bot filter: drop visitors with ≥ N hits to the same path within the window.
export const BOT_BURST_HITS = 3;
export const BOT_BURST_WINDOW_SECONDS = 2;

// Cron: max dates processed per run. Keeps D1 subrequests under the Free plan cap.
export const MAX_DAYS_PER_RUN = 10;

// Cron: minimum age in days before a date is eligible for aggregation.
export const RAW_EVENT_RETENTION_DAYS = 2;
