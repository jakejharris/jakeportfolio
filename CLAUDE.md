# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Development server with Turbopack (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Git Conventions

- Use `git switch -c <branch>` to create new branches (not `git checkout -b`)
- Use the [Conventional Commits](https://www.conventionalcommits.org/) standard for all commit messages (e.g., `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)

Note: Use `npm install --legacy-peer-deps` if you encounter peer dependency issues (also enforced on Vercel via `vercel.json` NPM_FLAGS).

## Architecture

This is a Next.js 15 portfolio and blog site using the App Router with Sanity CMS for content management. Deployed on Vercel at `https://jakejh.com`.

### Key Directories

- `app/` - Next.js App Router pages and components
- `app/components/` - Custom components (Navbar, transitions, theme, background canvas, content rendering)
- `app/components/ui/` - shadcn/ui components (Radix UI + Tailwind, "new-york" style preset)
- `app/css/` - Component-specific CSS (page styles, animations, overscroll fix)
- `app/lib/` - Sanity client setup, config, fonts, and utilities
- `app/types/` - TypeScript interfaces for Sanity content + ambient module declarations
- `app/hooks/` - Custom hooks (`useIsMobile` with 768px breakpoint)
- `sanity-schemas/` - Sanity CMS schema definitions (Post, Tag)

### Pages

| Route | Type | Description |
|---|---|---|
| `/` | Server | Homepage with post list (sorted by featured, then publishedAt) and PixelFluidBackground canvas |
| `/about` | Server | Static bio page with resume PDF and GitHub links |
| `/contact` | Client | Email copy-to-clipboard and LinkedIn link; metadata exported from `contact/layout.tsx` |
| `/posts/[slug]` | Server | Full blog post with PortableText, TableOfContents, ViewCounter, and JSON-LD (BlogPosting) |
| `/viewadmin` | Client | Internal admin panel for view count adjustments (password-protected, blocked in robots.ts) |

### Data Flow

1. **Sanity CMS** stores content (blog posts, tags) in a separate studio project (`jakeportfolio-studio`)
2. **`app/lib/sanity.client.ts`** provides `client` (read, `useCdn: false`, `perspective: 'published'`) and `writeClient` (mutations with `SANITY_API_WRITE_TOKEN`)
3. **`sanityFetch()`** helper handles GROQ queries with Next.js revalidation tags and `revalidate: 0` (no time-based caching; all revalidation is on-demand)
4. **Webhook revalidation** via `/api/revalidate` triggers `revalidateTag('post')` and `revalidatePath('/')` when Sanity content changes
5. **GROQ queries** are defined inline at callsites (not centralized), with projections to avoid over-fetching. Tags are dereferenced inline via `tags[]->{...}`

### API Routes

- `POST /api/revalidate` - Sanity webhook handler. Validates `x-webhook-secret` header, then calls `revalidateTag` and `revalidatePath`
- `POST /api/views` - Increments `viewCount` on a post by slug using `writeClient.patch().inc()`
- `GET /api/viewadmin` - Lists all posts with view counts (no auth)
- `POST /api/viewadmin` - Adjusts a specific post's view count by a delta amount (no auth, relies on obscurity)

### Styling

- **Tailwind CSS** with CSS variable color system in `globals.css` (HSL tokens via `hsl(var(--token))`)
- **Dark mode** via `next-themes` (class strategy, `.dark` on `<html>`)
- **Accent color system** — 5 options (default + red/blue/green/orange) controlled by `data-accent` attribute on `<html>`, persisted in `localStorage` under key `accent-index`. `AccentScript` applies the attribute before hydration to prevent flash.
- **shadcn/ui** "new-york" style preset with `lucide-react` icons
- **Component CSS** in `app/css/`: `page.css` (glassmorphism `.pageLinkContainer`), `animations.css` (transition particles, scanline sweep)
- **Portable Text styles** in `globals.css` under `.portable-text` class

### Key Patterns

- **Hydration mismatch prevention** — Components use `mounted` state pattern, opacity-based icon switching, or `ClientOnly` wrappers to avoid SSR/client mismatches
- **Feature flags** — Top-of-file constants toggle features: `ENABLE_PAGE_TRANSITIONS = false` (TransitionOverlay), `ENABLE_PIXEL_FLUID_BACKGROUND = true` (canvas background)
- **Navigation** — All internal links use `TransitionLink` (wraps Next.js `Link`). Internal hrefs use trailing `#` (e.g., `href="/about#"`) with `scroll={true}` for scroll-to-top on same-page navigation
- **Scroll management** — `ScrollToTop` component handles scroll reset on navigation; `experimental.scrollRestoration` is disabled in next.config.js
- **Portable Text headings** — Bold (`strong`-marked) text in normal paragraphs is treated as section headings (not Sanity's built-in h1–h4). Both `TableOfContents` and the custom block renderer generate heading IDs in format `section-{block._key}`
- **Metadata** — Static pages export `metadata` directly. Dynamic posts use `generateMetadata()`. All include canonical URLs, OpenGraph, and Twitter cards. JSON-LD structured data in root layout (WebSite, Person) and post pages (BlogPosting)

### Sanity Content Model

**Post** (`post` document type):
- Core: `title`, `slug`, `publishedAt`, `featured` (boolean), `mainImage` (with hotspot, alt, caption), `excerpt` (max 300 chars)
- `tags` — array of references to `tag` documents
- `content` — Portable Text supporting: block text (h1–h4, blockquote, code), inline images, youtube embeds, codeSnippet (10 languages), imageCarousel, callToAction, quoteBlock, divider
- `externalLinks` — array of `{title, url, icon}` where icon is from: FaGithub, FaGlobe, FaYoutube, FaLinkedin, FaNpm, FaCodepen, FaFigma, FaDribbble, FaStackOverflow, FaMedium
- `viewCount` — number, read-only in Studio, incremented via `/api/views`
- `seo` — object with `metaTitle` (max 60), `metaDescription` (max 160), `shareImage`

**Tag** (`tag` document type):
- `title`, `slug`, `description`, `color` (hex color, validated via regex)

### TypeScript Path Aliases

- `@/*` → project root
- `@/app/*` → `./app/*`
- `@/app/components/*` → components
- `@/app/lib/*` → lib utilities
- `@/app/hooks/*` → custom hooks

## Environment Variables

```
NEXT_PUBLIC_SANITY_PROJECT_ID    # Sanity project ID (required)
NEXT_PUBLIC_SANITY_DATASET       # Dataset (default: 'production')
NEXT_PUBLIC_SANITY_API_VERSION   # API version (default: '2023-05-03')
SANITY_API_WRITE_TOKEN           # Write token for mutations (required for view counting)
SANITY_WEBHOOK_SECRET            # Webhook validation secret (required for revalidation)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID  # Google Analytics GA4 measurement ID
```

## Sanity Integration Notes

- The Sanity Studio lives in a separate `jakeportfolio-studio` directory
- Schema changes must be synchronized between both projects
- Frontend queries in page files must match schema structure in `sanity-schemas/`
- `useCdn: false` and `perspective: 'published'` on the read client — drafts are never exposed
- `writeClient` is only used server-side in API routes, never in page components
- All queries use `tags: ['post']` as a single global cache tag busted by the webhook
- On Jake's local PC, the Sanity Studio repo is at `C:\Users\Jake\Documents\jakeportfolio-studio`

## Next.js Config Notes

- `trailingSlash: true` — all URLs end with `/`, important for link construction
- `images.remotePatterns` — only `cdn.sanity.io/images/**` is allowed
- `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true` — errors don't block production builds (ESLint 8.x / eslint-config-next 13.x pinned behind Next.js 15)

## SEO

- **Sitemap** (`app/sitemap.ts`) — Dynamic, includes static pages and all Sanity posts
- **Robots** (`app/robots.ts`) — Allows `/`, disallows `/api/` and `/viewadmin/`
- **JSON-LD** — WebSite + Person schemas in root layout; BlogPosting schema on post pages
- **OpenGraph/Twitter** — Configured on all pages with canonical URLs
- **Base URL** — `https://jakejh.com`

## Key Dependencies

| Category | Packages |
|---|---|
| Framework | Next.js 15, React 18 |
| CMS | sanity, next-sanity, @sanity/image-url |
| Content | @portabletext/react, react-syntax-highlighter |
| UI | 22 @radix-ui packages, lucide-react, react-icons, sonner, vaul, cmdk |
| Styling | Tailwind CSS 3, tailwindcss-animate, class-variance-authority, tailwind-merge |
| Forms | react-hook-form, zod, @hookform/resolvers |
| Theme | next-themes |
| Analytics | @next/third-parties (Google Analytics) |
