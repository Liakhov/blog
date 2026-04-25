# Personal Blog — Yurii Liakhov

Astro 6 blog deployed to Cloudflare Workers.

## Stack

- **Astro 6** — hybrid rendering (SSR default, static pages opt in with `export const prerender = true`)
- **Tailwind CSS v4** — via Vite plugin, semantic color tokens in `src/styles/global.css`
- **Cloudflare Workers** — adapter: `@astrojs/cloudflare`, config: `wrangler.json`
- **Cloudflare D1** — SQLite database for analytics storage
- **Content Collections** — Markdown/MDX posts in `src/content/posts/`, schema in `src/content.config.ts`
- **Fonts** — Inter (UI) and Lora (prose) via Astro's built-in `fonts` config
- **pnpm**, Node >= 22.12

## Analytics

Privacy-first pageview tracking — no cookies, no client-side JS, no third-party scripts.

- Tracking runs in middleware via `waitUntil()` (non-blocking)
- Visitor identity: daily-rotating SHA-256 hash of anonymized IP + User-Agent + salt
- Bot filtering: `isbot` library on ingestion + behavioral detection during rollup
- Data stored in Cloudflare D1 (`migrations/0001_analytics.sql`)

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

## Getting Started

```bash
pnpm install
cp .dev.vars.example .dev.vars   # fill in real values
npx wrangler d1 migrations apply blog --local
pnpm dev
```

## Deploy

First time — create a D1 database, apply migrations, and set secrets:

```bash
npx wrangler d1 create blog
npx wrangler d1 migrations apply blog --remote
npx wrangler secret put ANALYTICS_SALT
npx wrangler secret put CRON_SECRET
```

Build and deploy (or use CI):

```bash
pnpm build && npx wrangler deploy
```

## Commands

```bash
pnpm dev            # Local dev server
pnpm build          # Production build
pnpm preview        # Preview production build locally
pnpm lint           # Run ESLint
pnpm lint:fix       # Run ESLint with auto-fix
pnpm format         # Format all files with Prettier
pnpm format:check   # Check formatting without writing
```
