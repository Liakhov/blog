import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { isbot } from 'isbot';
import { visitorHash } from './hash';
import { parseUA } from './ua';
import { insertPageview } from './db';

const SKIP_EXTENSIONS = /\.(css|js|ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|map|xml|json)$/;
const SKIP_PREFIXES = ['/stats', '/_', '/api/'];

async function trackPageview(request: Request, db: D1Database, salt: string): Promise<void> {
  const url = new URL(request.url);
  const path = (url.pathname.replace(/\/+$/, '') || '/').toLowerCase();

  if (SKIP_EXTENSIONS.test(path) || SKIP_PREFIXES.some(p => path.startsWith(p))) {
    return;
  }

  const purpose = request.headers.get('purpose') ?? request.headers.get('sec-purpose');
  if (purpose === 'prefetch') return;

  const ua = request.headers.get('user-agent') ?? '';

  if (!ua || isbot(ua)) return;

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

export const track = defineMiddleware((context, next) => {
  const cfContext = context.locals.cfContext;

  if (!cfContext) return next();

  const db = env.DB;
  const salt = env.ANALYTICS_SALT;
  if (!salt) {
    console.warn('[analytics] ANALYTICS_SALT is not set — tracking disabled');
    return next();
  }

  cfContext.waitUntil(
    trackPageview(context.request, db, salt).catch(err => {
      console.error('[analytics]', err);
    })
  );
  return next();
});
