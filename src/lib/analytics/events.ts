import type { PageviewEvent } from '@/lib/types';

export async function insertPageview(db: D1Database, event: PageviewEvent): Promise<void> {
  await db
    .prepare(
      `INSERT INTO pageview_events
         (visitor_id, path, referrer, country, browser, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      event.visitorId,
      event.path,
      event.referrer,
      event.country,
      event.browser,
      event.createdAt
    )
    .run();
}
