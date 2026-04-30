// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://liakhov.dev',
  integrations: [
    mdx(),
    sitemap({
      filter: page => !page.endsWith('/stats/')
    })
  ],
  vite: {
    plugins: [tailwindcss()]
  },
  output: 'server',
  adapter: cloudflare(),
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: 'public',
        context: 'client',
        optional: true
      })
    }
  },
  markdown: {
    shikiConfig: {
      theme: 'material-theme'
    }
  },

  devToolbar: {
    enabled: false
  }
});
