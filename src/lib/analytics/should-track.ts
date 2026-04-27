/**
 * Only track real pageviews: 200 responses with an HTML content type.
 * Filters out 404s (bot probes for non-existent paths), redirects,
 * and non-HTML routes (robots.txt, RSS, sitemap, JSON, static assets).
 */
export function shouldTrackResponse(response: Response): boolean {
  if (response.status !== 200) return false;
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('text/html');
}
