export async function getDashboardData(db: D1Database) {
  const results = await db.batch([
    db.prepare(`
      SELECT COUNT(*) as views, COUNT(DISTINCT visitor_id) as visitors
      FROM pageview_events
      WHERE date(created_at) = date('now')
    `),
    db.prepare(`
      SELECT date, SUM(views) as views, SUM(visitors) as visitors
      FROM stats_daily
      WHERE date >= date('now', '-7 days')
      GROUP BY date ORDER BY date
    `),
    db.prepare(`
      SELECT date, SUM(views) as views, SUM(visitors) as visitors
      FROM stats_daily
      WHERE date >= date('now', '-30 days')
      GROUP BY date ORDER BY date
    `),
    db.prepare(`
      SELECT path, views, visitors FROM stats_all_time
      ORDER BY views DESC LIMIT 20
    `),
    db.prepare(`
      SELECT referrer, SUM(hits) as hits
      FROM stats_daily_referrers
      WHERE date >= date('now', '-30 days')
      GROUP BY referrer ORDER BY hits DESC LIMIT 20
    `),
    db.prepare(`
      SELECT browser, SUM(hits) as hits
      FROM stats_daily_browsers
      WHERE date >= date('now', '-30 days')
      GROUP BY browser ORDER BY hits DESC
    `),
    db.prepare(`
      SELECT country, SUM(hits) as hits
      FROM stats_daily_countries
      WHERE date >= date('now', '-30 days')
      GROUP BY country ORDER BY hits DESC LIMIT 20
    `)
  ]);

  return {
    today: results[0].results[0] as { views: number; visitors: number },
    last7Days: results[1].results as { date: string; views: number; visitors: number }[],
    last30Days: results[2].results as { date: string; views: number; visitors: number }[],
    topPages: results[3].results as { path: string; views: number; visitors: number }[],
    topReferrers: results[4].results as { referrer: string; hits: number }[],
    browsers: results[5].results as { browser: string; hits: number }[],
    countries: results[6].results as { country: string; hits: number }[]
  };
}
