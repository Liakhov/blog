# Personal Blog — Yurii Liakhov

Astro 6 blog deployed to Cloudflare Workers. Currently in early stage with placeholder content being replaced with real posts.

## Stack

- **Astro 6** (hybrid: SSR default, static pages opt in with `export const prerender = true`)
- **Tailwind CSS v4** via Vite plugin — semantic color tokens defined in `src/styles/global.css`
- **Cloudflare Workers** — adapter: `@astrojs/cloudflare`, config: `wrangler.json`
- **Content Collections** — Markdown/MDX in `src/content/posts/`, schema in `src/content.config.ts`
- **Fonts** — Inter (UI), Lora (prose body) via Astro's built-in `fonts` config
- **pnpm** package manager, Node >= 22.12

## Project Structure

```
src/
├── assets/              # Images (optimized by Sharp at build)
├── components/          # Small, single-purpose .astro components
├── content/posts/        # Blog posts as .md/.mdx files
├── layouts/BlogPost.astro  # Sole layout — wraps all content pages
├── pages/               # File-based routing
│   ├── index.astro      # Homepage
│   ├── about.astro      # About page (reuses BlogPost layout)
│   ├── posts/           # /posts listing + /posts/:slug detail
│   └── robots.txt.ts    # API route
├── styles/global.css    # Tailwind config, color tokens, base styles
├── consts.ts            # Site-wide constants (title, description)
├── content.config.ts    # Content collection schema
└── middleware.ts         # Placeholder (no-op)
```

## Commands

```bash
pnpm dev        # Local dev server
pnpm build      # Production build
pnpm preview    # Preview production build locally
```

## Key Conventions

- Follow existing patterns — before creating or editing a component/page, search the codebase for similar examples and match their structure, naming, and approach
- Use Tailwind utility classes — prefer Tailwind classes over scoped `<style>` blocks or inline styles
- Every static page exports `prerender = true` at the top of frontmatter
- Pages are full HTML documents — no shared layout wrapper; each composes `<BaseHead>`, `<Header>`, `<Footer>` directly
- Use semantic color tokens from `global.css` (`--color-background`, `--color-surface`, `--color-muted-foreground`, etc.) — never raw color values
- Use the `wrapper` utility class for horizontal page containment (48rem max-width)
- Blog post frontmatter schema: `title`, `description`, `pubDate` (required); `updatedDate`, `heroImage` (optional)
- Site constants live in `src/consts.ts`
