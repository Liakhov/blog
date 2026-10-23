# Personal Blog — Yurii Liakhov

Astro 7 blog deployed to Cloudflare Workers.

## Stack

- **Astro 7** — server rendering (`output: 'server'`; SSR default, static pages opt in with `export const prerender = true`)
- **Tailwind CSS v4** — via Vite plugin, semantic color tokens in `src/styles/global.css`
- **Cloudflare Workers** — adapter: `@astrojs/cloudflare`, config: `wrangler.json`
- **Cloudflare D1** — SQLite database for analytics storage
- **Content Collections** — Markdown/MDX posts in `src/content/posts/`, schema in `src/content.config.ts`
- **Fonts** — system sans-serif stack in `src/styles/global.css`
- **pnpm**, Node >= 24

## Analytics

Privacy-first pageview tracking — no cookies, no localStorage for analytics, no third-party tracking scripts.
The theme preference is stored separately in localStorage.

- Browser fires `navigator.sendBeacon` to `/api/event` on `astro:page-load`, including ClientRouter navigation (except `/stats`)
- `/api/event` is the single writer to `pageview_events` — derives path,
  IP, country, UA server-side; rejects empty/`isbot` UAs and cross-origin
  POSTs (Astro CSRF + same-origin Referer check)
- Visitor identity: daily-rotating SHA-256 hash of anonymized IP + UA + salt
- Three layers of bot filtering: beacon (no JS → not counted),
  endpoint header checks, and a CTE that flags high-volume and
  same-path-burst visitors in live dashboard queries and during nightly rollup
- Cron runs at 00:30 UTC, aggregates dates at least two days old, and deletes
  their raw events atomically with the rollups (up to 10 dates per run)
- `/stats` shows live totals and breakdowns, plus 7/30-day traffic charts and
  tables combining raw events with daily rollups. Historical breakdowns and
  all-time totals lag by about two days; visitor counts across days are sums
  of daily counts, not unique people over the whole period
- Data stored in Cloudflare D1 (`migrations/`); see [analytics documentation](docs/analytics.md)

## Project Structure

```
src/
├── components/
│   ├── Card, Header, Footer, FormattedDate
│   └── stats/                  # Cards, lists, traffic charts and daily tables
├── content/posts/              # Blog posts (.md/.mdx)
├── layouts/
│   ├── BaseLayout.astro        # HTML shell + ClientRouter + inline beacon script
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
pnpm exec wrangler d1 migrations apply blog --local
pnpm dev
```

## Deploy

First time — create a D1 database, copy its `database_id` into
`wrangler.json` (binding `DB`, database name `blog`), then apply migrations
and set the analytics secret:

```bash
pnpm exec wrangler d1 create blog
pnpm exec wrangler d1 migrations apply blog --remote
pnpm exec wrangler secret put ANALYTICS_SALT
```

Build and deploy:

```bash
pnpm build && pnpm exec wrangler deploy
```

CI deploys on pushes to `main` or manual dispatch via
`.github/workflows/deploy.yml`. The `cloudflare` GitHub environment needs
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. Database migrations
and `ANALYTICS_SALT` are configured separately with the commands above.

## Content

Posts require `title`, `description`, and `pubDate`; optional fields are
`updatedDate`, `heroImage`, and `draft`. Homepage and post listings exclude
`draft: true`, but post detail routes and RSS currently include drafts.

## Commands

```bash
pnpm dev            # Local dev server
pnpm build          # Production build
pnpm preview        # Preview production build locally
pnpm test           # Analytics SQL tests using Node test runner + SQLite
pnpm lint           # Run ESLint
pnpm lint:fix       # Run ESLint with auto-fix
pnpm format         # Format all files with Prettier
pnpm format:check   # Check formatting without writing
```

## Agent Instructions

Repository conventions and verification guidance live in [AGENTS.md](AGENTS.md).
