/**
 * `dateExpr` is interpolated raw — never user input. Caller binds the
 * high-volume threshold, burst window seconds, and burst hit count via
 * the trailing `?` placeholders. Pair with:
 *   AND visitor_id NOT IN (SELECT visitor_id FROM bots)
 */
export function botFilterCte(dateExpr: string): string {
  return `
    WITH high_volume_bots AS (
      SELECT visitor_id
      FROM pageview_events
      WHERE date(created_at) = ${dateExpr}
      GROUP BY visitor_id
      HAVING COUNT(*) > ?
    ),
    burst_bots AS (
      SELECT e1.visitor_id
      FROM pageview_events e1
      JOIN pageview_events e2
        ON e2.visitor_id = e1.visitor_id
       AND e2.path = e1.path
       AND date(e2.created_at) = ${dateExpr}
       AND julianday(e2.created_at) >= julianday(e1.created_at)
       AND (julianday(e2.created_at) - julianday(e1.created_at)) * 86400.0 <= ?
      WHERE date(e1.created_at) = ${dateExpr}
      GROUP BY e1.visitor_id, e1.path, e1.created_at
      HAVING COUNT(*) >= ?
    ),
    bots AS (
      SELECT visitor_id FROM high_volume_bots
      UNION
      SELECT visitor_id FROM burst_bots
    )
  `;
}
