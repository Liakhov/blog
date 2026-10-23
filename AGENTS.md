# Personal Blog — Yurii Liakhov

Astro 7 blog deployed to Cloudflare Workers.

## Stack

- **Astro 7** (`output: 'server'`: SSR default, static pages opt in with `export const prerender = true`)
- **Tailwind CSS v4** via Vite plugin — semantic color tokens defined in `src/styles/global.css`
- **Cloudflare Workers** — adapter: `@astrojs/cloudflare`, config: `wrangler.json`
- **Cloudflare D1** — SQLite database for analytics, schema in `migrations/`
- **Content Collections** — Markdown/MDX in `src/content/posts/`, schema in `src/content.config.ts`
- **Fonts** — system sans-serif stack in `src/styles/global.css`
- **pnpm** package manager, Node >= 24

## Project Structure

```
src/
├── components/
│   ├── Card, Header, Footer, FormattedDate
│   └── stats/                  # Cards, lists, traffic charts and daily tables
├── content/posts/              # Blog posts (.md/.mdx)
├── layouts/
│   ├── BaseLayout.astro        # HTML shell (head, meta, fonts, OG tags, beacon)
│   ├── HomeLayout.astro        # Homepage with optional recent-posts slot
│   ├── PageLayout.astro        # Static pages (about, etc.) via Markdown layout
│   ├── PostLayout.astro        # Single blog post
│   └── PostsLayout.astro       # Post listing page
├── lib/
│   ├── analytics/              # Privacy-first pageview tracking (no cookies, beacon-based)
│   │   ├── bot-filter.ts       # Shared bot-filter CTE (high-volume + same-path burst)
│   │   ├── cron.ts             # Daily rollup logic — aggregates and deletes raw events
│   │   ├── dashboard-stats.ts  # Single D1 batch read for /stats
│   │   ├── events.ts           # insertPageview helper
│   │   ├── hash.ts             # Daily-rotating SHA-256 visitor hash
│   │   ├── ip.ts               # IP anonymization (/24 IPv4, /64 IPv6)
│   │   └── ua.ts               # User-Agent parsing (browser only)
│   └── types.ts                # Shared TS types
├── pages/
│   ├── index.astro             # Homepage
│   ├── about.md                # About page (uses PageLayout)
│   ├── 404.astro
│   ├── stats.astro             # Analytics dashboard
│   ├── posts/                  # /posts listing + /posts/:slug detail
│   ├── api/event.ts            # POST /api/event — single writer to pageview_events
│   ├── robots.txt.ts
│   └── rss.xml.js
├── scripts/theme-handler.ts
├── styles/global.css           # Tailwind config, color tokens, base styles
├── consts.ts                   # Site-wide constants + analytics tuning
├── content.config.ts           # Content collection schema
├── env.d.ts
└── worker.ts                   # Cloudflare Worker entry — scheduled() → handleCron
```

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

## Setup and Deployment

- `pnpm install`, copy `.dev.vars.example` to `.dev.vars`, set `ANALYTICS_SALT`, then run `pnpm exec wrangler d1 migrations apply blog --local` before `pnpm dev`.
- Deploy with `pnpm build && pnpm exec wrangler deploy`. Production uses the `DB` binding and database ID in `wrangler.json`; apply remote migrations and set `ANALYTICS_SALT` separately.
- CI deploys `main` via `.github/workflows/deploy.yml` (Node 24, pnpm 10).

## Analytics Invariants

- `/api/event` is the single writer to `pageview_events`; derive the path from the same-origin Referer and identity from server headers. Keep tracking free of cookies and browser storage. Theme preference uses localStorage separately.
- `BaseLayout` uses `ClientRouter`; the beacon fires on `astro:page-load` and skips `/stats`. Client-side initialization must account for navigation.
- Preserve daily UTC visitor hashes, IP anonymization, and bot filtering for both live reads and rollups. Tuning constants live in `src/consts.ts`.
- Cron runs at 00:30 UTC, processes dates at least two days old (up to 10 dates/run), and commits each date's rollups and raw-event deletion in one atomic D1 batch.
- Traffic combines raw events and daily rollups; historical breakdowns and all-time totals lag by about two days. Per-day distinct visitors come from `stats_daily_totals`, not a sum across paths. Multi-day visitor totals sum daily counts.
- See `docs/analytics.md` for the analytics design; check actual queries and migrations when changing behavior.

## Key Conventions

- Follow existing patterns — before creating or editing a component/page, search the codebase for similar examples and match their structure, naming, and approach
- Use Tailwind utility classes — prefer Tailwind classes over scoped `<style>` blocks or inline styles
- Every static page exports `prerender = true` at the top of frontmatter
- Pages use layout components (HomeLayout, PageLayout, PostLayout, PostsLayout) which wrap BaseLayout + Header + Footer
- Use semantic color tokens from `global.css` (`--color-background`, `--color-surface`, `--color-muted-foreground`, etc.) — never raw color values
- Use the `wrapper` utility class for horizontal page containment (48rem max-width)
- Blog post frontmatter schema: `title`, `description`, `pubDate` (required); `updatedDate`, `heroImage`, `draft` (optional)
- `draft: true` is excluded from the homepage and post listing only; detail routes and RSS currently include drafts. Do not assume draft content is private.
- Use the `@/` alias for imports from `src/`.
- Site constants live in `src/consts.ts`

## Working Principles (Karpathy-inspired)

### 1. Think Before Coding

Don't assume — ask. Surface ambiguity instead of silently picking one interpretation.

- Ambiguous request (e.g. "add tracking" — which event? where?) → list options and ask.
- State assumptions about SSR vs prerender, D1 schema, or analytics before acting on them.
- Push back when a simpler path exists ("does this need an API route, or can it be static?").
- Confused about `src/lib/analytics/` or layouts? Stop and ask.

### 2. Simplicity First

Minimum code that solves the problem.

- No new abstractions for single-use code — inline it.
- No flags, options, or "flexibility" that wasn't asked for.
- No error handling for impossible cases (e.g. a D1 binding declared in `wrangler.json`).
- Past ~100 lines in a component? Ask before splitting — don't split preemptively.
- Prefer Tailwind utilities and semantic tokens over new CSS or scoped styles.

### 3. Surgical Changes

Touch only what the task requires.

- Don't reformat, rename, or "improve" adjacent code while doing something else.
- Don't refactor `src/lib/analytics/` or layouts unless that's the task.
- Match the file's existing style, even if you'd write it differently.
- Spot unrelated dead code or a bug? Mention it — don't fix it in this change.
- Only remove imports/vars _your_ edit orphaned. Leave pre-existing dead code alone.

### 4. Goal-Driven Execution

Define "done" before starting.

- "Fix the stats page" → renders without errors, shows X for last 7 days, verified via `pnpm dev`.
- "Add a post" → file in `src/content/posts/` with required frontmatter, `pnpm build` passes.
- For multi-step work, list steps + how each is verified (lint, build, URL check).
- UI/style changes: verify in browser via `pnpm dev` — builds don't prove a feature looks right.

## Verification

- Run `pnpm test` for analytics query changes; tests execute the actual SQL against in-memory SQLite with migrations applied.
- Run `pnpm lint` and `pnpm build` for code changes; check formatting with `pnpm format:check` (or target edited files with `pnpm exec prettier --check <files>`).
- For documentation-only changes, verify paths, scripts, and configuration against the repository and check formatting of edited Markdown files.
