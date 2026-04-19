# Personal Blog — Yurii Liakhov

Astro 6 blog deployed to Cloudflare Workers.

## Stack

- **Astro 6** — hybrid rendering (SSR default, static pages opt in with `export const prerender = true`)
- **Tailwind CSS v4** — via Vite plugin, semantic color tokens in `src/styles/global.css`
- **Cloudflare Workers** — adapter: `@astrojs/cloudflare`, config: `wrangler.json`
- **Content Collections** — Markdown/MDX posts in `src/content/posts/`, schema in `src/content.config.ts`
- **Fonts** — Inter (UI) and Lora (prose) via Astro's built-in `fonts` config
- **pnpm**, Node >= 22.12

## Project Structure

```
src/
├── components/           # Card, Header, Footer, FormattedDate
├── content/posts/        # Blog posts (.md/.mdx)
├── layouts/
│   ├── BaseLayout.astro  # HTML shell (head, meta, fonts, OG tags)
│   ├── HomeLayout.astro  # Homepage with optional recent-posts slot
│   ├── PageLayout.astro  # Static pages (about, etc.) via Markdown layout
│   ├── PostLayout.astro  # Single blog post
│   └── PostsLayout.astro # Post listing page
├── pages/
│   ├── index.astro       # Homepage
│   ├── about.md          # About page (uses PageLayout)
│   ├── 404.astro         # Not found
│   ├── posts/            # /posts listing + /posts/:slug detail
│   ├── robots.txt.ts     # API route
│   └── rss.xml.js        # RSS feed
├── styles/global.css     # Tailwind config, color tokens, base styles
├── consts.ts             # Site-wide constants (title, socials)
└── content.config.ts     # Content collection schema
```

## Commands

```bash
pnpm dev        # Local dev server
pnpm build      # Production build
pnpm preview    # Preview production build locally
pnpm lint       # Run ESLint
pnpm format     # Run Prettier
```
