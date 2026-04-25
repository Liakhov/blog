# Personal Blog — Yurii Liakhov

Astro 6 blog deployed to Cloudflare Workers.

## Stack

- **Astro 6** — hybrid rendering (SSR default, static pages opt in with `export const prerender = true`)
- **Tailwind CSS v4** — via Vite plugin, semantic color tokens in `src/styles/global.css`
- **Cloudflare Workers** — adapter: `@astrojs/cloudflare`, config: `wrangler.json`
- **Cloudflare D1** — SQLite database for analytics storage
- **Content Collections** — Markdown/MDX posts in `src/content/posts/`, schema in `src/content.config.ts`
- **Fonts** — Inter (UI) and Lora (prose) via Astro's built-in `fonts` config
- **pnpm**, Node >= 24

## Analytics

Privacy-first pageview tracking — no cookies, no client-side JS, no third-party scripts.

- Tracking runs in middleware via `waitUntil()` (non-blocking)
- Visitor identity: daily-rotating SHA-256 hash of anonymized IP + User-Agent + salt
- Bot filtering: `isbot` library on ingestion + behavioral detection during rollup
- Data stored in Cloudflare D1 (`migrations/0001_analytics.sql`)

## Project Structure

```
src/
├── assets/icons/         # SVG icons (arrow-left, calendar, moon, sun)
├── components/           # Card, Header, Footer, FormattedDate, StatsList
├── content/posts/        # Blog posts (.md/.mdx)
├── layouts/
│   ├── BaseLayout.astro  # HTML shell (head, meta, fonts, OG tags)
│   ├── HomeLayout.astro  # Homepage with optional recent-posts slot
│   ├── PageLayout.astro  # Static pages (about, etc.) via Markdown layout
│   ├── PostLayout.astro  # Single blog post
│   └── PostsLayout.astro # Post listing page
├── lib/
│   ├── analytics/        # Privacy-first pageview tracking (no cookies, no client JS)
│   │   ├── cron.ts       # Daily rollup cron job
│   │   ├── db.ts         # D1 query helpers
│   │   ├── hash.ts       # Daily-rotating SHA-256 visitor hash
│   │   ├── ip.ts         # IP anonymization
│   │   ├── track.ts      # Tracking orchestrator (called from middleware)
│   │   └── ua.ts         # User-Agent parsing
│   └── types.ts          # Shared type definitions
├── pages/
│   ├── index.astro       # Homepage
│   ├── about.md          # About page (uses PageLayout)
│   ├── 404.astro         # Not found
│   ├── api/cron.ts       # Cron API endpoint
│   └── posts/            # /posts listing + /posts/:slug detail
├── scripts/
│   └── theme-handler.ts  # Dark/light theme toggle logic
├── styles/global.css     # Tailwind config, color tokens, base styles
├── consts.ts             # Site-wide constants (title, socials)
├── content.config.ts     # Content collection schema
├── env.d.ts              # TypeScript environment declarations
└── middleware.ts          # Analytics tracking via waitUntil()
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
