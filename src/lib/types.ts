export interface PageviewEvent {
  visitorId: string;
  path: string;
  referrer: string | null;
  country: string | null;
  browser: string | null;
  createdAt: string;
}

export interface Totals {
  views: number;
  visitors: number;
}

export interface PathRow {
  path: string;
  views: number;
  visitors: number;
}

export interface DateTotalsRow {
  date: string;
  views: number;
  visitors: number;
}

export interface ReferrerRow {
  referrer: string;
  hits: number;
}

export interface BrowserRow {
  browser: string;
  hits: number;
}

export interface CountryRow {
  country: string;
  hits: number;
}

export interface DashboardData {
  // Live (today) — raw events, bots filtered in-query.
  liveTodayTotals: Totals;
  liveTodayPages: PathRow[];

  // Yesterday — still in pageview_events thanks to the 2-day buffer.
  yesterday: Totals;

  // Historical — cron-built rollups, ordered ascending by date.
  last7Days: DateTotalsRow[];
  last30Days: DateTotalsRow[];

  // Top breakdowns over multi-day windows.
  topPagesAllTime: PathRow[];
  // 30-day window — what's hot now, not dominated by year-old posts.
  topPages30d: PathRow[];
  topReferrers30d: ReferrerRow[];
  topBrowsers30d: BrowserRow[];
  topCountries30d: CountryRow[];

  // Headline aggregates. visitors = sum of per-day uniques,
  // not unique-over-N-days.
  total7Days: Totals;
  total30Days: Totals;
  totalAllTime: Totals;
}
