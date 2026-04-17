// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from "@tailwindcss/vite"

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com',
	integrations: [mdx(), sitemap()],
    vite: {
        plugins: [tailwindcss()],
    },
    output: 'server',
    adapter: cloudflare(),
	fonts: [
		{
			name: "Inter",
			cssVariable: "--font-inter",
			provider: fontProviders.google(),
			fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
			weights: [400, 500, 600, 700],
			styles: ["normal"],
		},
		{
			name: "Lora",
			cssVariable: "--font-lora",
			provider: fontProviders.google(),
			fallbacks: ["Georgia", "serif"],
			weights: [400, 500, 600, 700],
			styles: ["normal", "italic"],
		},
	],
    devToolbar: {
        enabled: false
    }
});
