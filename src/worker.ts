/**
 * Custom Cloudflare Worker entry point.
 *
 * Wraps Astro's request handler so we can attach our own scheduled()
 * handler for the analytics cron. Wrangler picks this file up via the
 * `main` field in wrangler.json, and the cron schedule is configured
 * via `triggers.crons`.
 *
 * Env types come from the global `Cloudflare.Env` augmentation in
 * src/env.d.ts.
 *
 * See:
 *   https://docs.astro.build/en/guides/integrations-guide/cloudflare/#changed-custom-entrypoint-api
 *   https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
 */

import { handle } from '@astrojs/cloudflare/handler';

export default {
  fetch(request, env, ctx) {
    return handle(request, env, ctx);
  },

  async scheduled(controller, _env, _ctx): Promise<void> {
    // TODO: replace with `await handleCron(env.DB)` once verified locally.
    console.log('[cron] scheduled fired', {
      cron: controller.cron,
      scheduledTime: new Date(controller.scheduledTime).toISOString()
    });
  }
} satisfies ExportedHandler<Cloudflare.Env>;
