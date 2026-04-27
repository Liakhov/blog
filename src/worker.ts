/**
 * Worker entrypoint.
 * fetch — serves Astro requests.
 * scheduled — runs the analytics cron.
 */

import { handle } from '@astrojs/cloudflare/handler';
import { handleCron } from './lib/analytics/cron';

export default {
  fetch(request, env, ctx) {
    return handle(request, env, ctx);
  },

  async scheduled(_controller, env, ctx): Promise<void> {
    ctx.waitUntil(handleCron(env.DB));
  }
} satisfies ExportedHandler<Cloudflare.Env>;
