# Personal Blog — Yurii Liakhov

Astro 6 blog deployed to Cloudflare Workers. Currently in early stage with placeholder content being replaced with real posts.

## Stack

- **Astro 6** (hybrid: SSR default, static pages opt in with `export const prerender = true`)
- **Tailwind CSS v4** via Vite plugin — semantic color tokens defined in `src/styles/global.css`
- **Cloudflare Workers** — adapter: `@astrojs/cloudflare`, config: `wrangler.json`
- **Cloudflare D1** — SQLite database for analytics, schema in `migrations/`
- **Content Collections** — Markdown/MDX in `src/content/posts/`, schema in `src/content.config.ts`
- **Fonts** — Inter (UI), Lora (prose body) via Astro's built-in `fonts` config
- **pnpm** package manager, Node >= 22.12

## Project Structure

```
src/
├── components/
│   ├── Card, Header, Footer, FormattedDate
│   └── stats/                  # StatsCard, StatsDailyTable, StatsList, StatsSection
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
│   │   ├── dashboard-stats.ts  # 11-query batch read for /stats
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
pnpm lint           # Run ESLint
pnpm lint:fix       # Run ESLint with auto-fix
pnpm format         # Format all files with Prettier
pnpm format:check   # Check formatting without writing
```

## Key Conventions

- Follow existing patterns — before creating or editing a component/page, search the codebase for similar examples and match their structure, naming, and approach
- Use Tailwind utility classes — prefer Tailwind classes over scoped `<style>` blocks or inline styles
- Every static page exports `prerender = true` at the top of frontmatter
- Pages use layout components (HomeLayout, PageLayout, PostLayout, PostsLayout) which wrap BaseLayout + Header + Footer
- Use semantic color tokens from `global.css` (`--color-background`, `--color-surface`, `--color-muted-foreground`, etc.) — never raw color values
- Use the `wrapper` utility class for horizontal page containment (48rem max-width)
- Blog post frontmatter schema: `title`, `description`, `pubDate` (required); `updatedDate`, `heroImage` (optional)
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
- Only remove imports/vars *your* edit orphaned. Leave pre-existing dead code alone.

### 4. Goal-Driven Execution
Define "done" before starting.
- "Fix the stats page" → renders without errors, shows X for last 7 days, verified via `pnpm dev`.
- "Add a post" → file in `src/content/posts/` with required frontmatter, `pnpm build` passes.
- For multi-step work, list steps + how each is verified (lint, build, URL check).
- UI/style changes: verify in browser via `pnpm dev` — builds don't prove a feature looks right.
