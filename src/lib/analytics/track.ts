import { visitorHash } from './hash';
import { isbot } from 'isbot';
import { parseUA } from './ua';
import { insertPageview } from './db';

const SKIP_EXTENSIONS = /\.(css|js|ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|map|xml|json)$/;
const SKIP_PREFIXES = ['/stats', '/_', '/api/'];

export async function trackPageview(request: Request, db: D1Database, salt: string): Promise<void> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (SKIP_EXTENSIONS.test(path) || SKIP_PREFIXES.some(p => path.startsWith(p))) {
    return;
  }

  const purpose = request.headers.get('purpose') ?? request.headers.get('sec-purpose');
  if (purpose === 'prefetch') return;

  const ua = request.headers.get('user-agent') ?? '';

  if (isbot(ua)) return;

  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const referrer = request.headers.get('referer');
  const country = request.headers.get('cf-ipcountry');

  const vid = await visitorHash(ip, ua, salt);
  const { browser, os, device } = parseUA(ua);

  let cleanReferrer: string | null = null;
  if (referrer) {
    try {
      const refUrl = new URL(referrer);
      if (refUrl.hostname !== url.hostname) {
        cleanReferrer = refUrl.hostname;
      }
    } catch {
      /* invalid URL */
    }
  }

  await insertPageview(db, {
    visitorId: vid,
    path,
    referrer: cleanReferrer,
    country,
    browser,
    os,
    device,
    isBot: false
  });
}
