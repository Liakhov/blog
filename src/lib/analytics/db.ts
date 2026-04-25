import type { PageviewEvent } from './../types';

export async function insertPageview(db: D1Database, event: PageviewEvent): Promise<void> {
  await db
    .prepare(
      `INSERT INTO pageview_events (visitor_id, path, referrer, country, browser, os, device, is_bot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      event.visitorId,
      event.path,
      event.referrer,
      event.country,
      event.browser,
      event.os,
      event.device,
      event.isBot ? 1 : 0
    )
    .run();
}
