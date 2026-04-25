import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { trackPageview } from '@/lib/analytics/track';

export const onRequest = defineMiddleware((context, next) => {
  const cfContext = context.locals.cfContext;

  if (!cfContext) {
    return next();
  }

  const db = (env as unknown as CloudflareEnv).DB;
  const salt = (env as unknown as CloudflareEnv).ANALYTICS_SALT;
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
