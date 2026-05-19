import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isbot } from 'isbot';

import { visitorHash } from '@/lib/analytics/hash';
import { parseUA } from '@/lib/analytics/ua';
import { insertPageview } from '@/lib/analytics/events';

export const prerender = false;

const SKIP_PREFIXES = ['/stats', '/_', '/api/'];
const MAX_BODY_BYTES = 512;

type BeaconPayload = {
  r?: string | null;
};

function parsePath(refererHeader: string | null, expectedOrigin: string): string | null {
  if (!refererHeader) return null;
  try {
    const url = new URL(refererHeader);
    if (url.origin !== expectedOrigin) return null;
    const path = (url.pathname.replace(/\/+$/, '') || '/').toLowerCase();
    if (SKIP_PREFIXES.some(p => path.startsWith(p))) return null;
    return path;
  } catch {
    return null;
  }
}

function cleanReferrer(raw: string | null | undefined, currentHost: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.hostname === currentHost) return null;
    return url.hostname;
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const ua = request.headers.get('user-agent') ?? '';
  if (!ua || isbot(ua)) return new Response(null, { status: 204 });

  const url = new URL(request.url);
  const path = parsePath(request.headers.get('referer'), url.origin);
  if (!path) return new Response(null, { status: 204 });

  let payload: BeaconPayload = {};
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 204 });
    if (text) payload = JSON.parse(text) as BeaconPayload;
  } catch {
    return new Response(null, { status: 204 });
  }

  const salt = env.ANALYTICS_SALT;
  if (!salt) {
    console.warn('[analytics] ANALYTICS_SALT is not set — tracking disabled');
    return new Response(null, { status: 204 });
  }

  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const country = request.headers.get('cf-ipcountry');
  const referrer = cleanReferrer(payload.r, url.hostname);

  const vid = await visitorHash(ip, ua, salt);
  const { browser, os, device } = parseUA(ua);

  await insertPageview(env.DB, {
    visitorId: vid,
    path,
    referrer,
    country,
    browser,
    os,
    device,
    createdAt: new Date().toISOString()
  });

  return new Response(null, { status: 204 });
};
