/**
 * `dateExpr` is interpolated raw — never user input. Caller binds the
 * threshold via the trailing `?`. Pair with:
 *   AND visitor_id NOT IN (SELECT visitor_id FROM bots)
 */
export function botFilterCte(dateExpr: string): string {
  return `
    WITH bots AS (
      SELECT visitor_id
      FROM pageview_events
      WHERE date(created_at) = ${dateExpr}
      GROUP BY visitor_id
      HAVING COUNT(*) > ?
    )
  `;
}
