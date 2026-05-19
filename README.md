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

Privacy-first pageview tracking — no cookies, no localStorage, no third-party scripts.

- Browser fires `navigator.sendBeacon` to `/api/event` on every page load
- `/api/event` is the single writer to `pageview_events` — derives path,
  IP, country, UA server-side; rejects empty/`isbot` UAs and cross-origin
  POSTs (Astro CSRF + same-origin Referer check)
- Visitor identity: daily-rotating SHA-256 hash of anonymized IP + UA + salt
- Three layers of bot filtering: beacon (no JS → not counted),
  endpoint header checks, and a CTE that flags high-volume and
  same-path-burst visitors during nightly rollup
- Data stored in Cloudflare D1 (`migrations/`); see `docs/analytics.md`

## Project Structure

```
src/
├── components/
│   ├── Card, Header, Footer, FormattedDate
│   └── stats/                  # StatsCard, StatsDailyTable, StatsList, StatsSection
├── content/posts/              # Blog posts (.md/.mdx)
├── layouts/
│   ├── BaseLayout.astro        # HTML shell + inline beacon script
│   ├── HomeLayout.astro
│   ├── PageLayout.astro
│   ├── PostLayout.astro
│   └── PostsLayout.astro
├── lib/
│   ├── analytics/              # Privacy-first pageview tracking
│   │   ├── bot-filter.ts       # Shared bot-filter CTE
│   │   ├── cron.ts             # Daily rollup aggregation
│   │   ├── dashboard-stats.ts  # /stats batch read
│   │   ├── events.ts           # insertPageview helper
│   │   ├── hash.ts             # Daily-rotating SHA-256 visitor hash
│   │   ├── ip.ts               # IP anonymization
│   │   └── ua.ts               # User-Agent parsing (browser name only)
│   └── types.ts
├── pages/
│   ├── index.astro
│   ├── about.md
│   ├── 404.astro
│   ├── stats.astro             # Analytics dashboard
│   ├── posts/
│   ├── api/event.ts            # POST /api/event — beacon ingest
│   ├── robots.txt.ts
│   └── rss.xml.js
├── scripts/theme-handler.ts
├── styles/global.css
├── consts.ts
├── content.config.ts
├── env.d.ts
└── worker.ts                   # Worker entry; scheduled() handler
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
