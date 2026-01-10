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

Note: Use `npm install --legacy-peer-deps` if you encounter peer dependency issues.

## Architecture

This is a Next.js 15 portfolio and blog site using the App Router with Sanity CMS for content management.

### Key Directories

- `app/` - Next.js App Router pages and components
- `app/components/ui/` - shadcn/ui components (Radix UI + Tailwind)
- `app/lib/` - Sanity client setup, config, and utilities
- `app/types/` - TypeScript interfaces for Sanity content
- `sanity-schemas/` - Sanity CMS schema definitions (Post, Tag)

### Data Flow

1. **Sanity CMS** stores content (blog posts, tags) in a separate studio project (`jakeportfolio-studio`)
2. **`app/lib/sanity.client.ts`** provides `client` (read) and `writeClient` (mutations) for fetching
3. **`sanityFetch()`** helper handles GROQ queries with Next.js revalidation tags
4. **Webhook revalidation** via `/api/revalidate` triggers cache invalidation when Sanity content changes

### API Routes

- `POST /api/revalidate` - Sanity webhook for content revalidation
- `POST /api/views` - Increment post view counter
- `POST /api/viewadmin` - Admin view tracking

### Styling

- Tailwind CSS with CSS variable color system in `globals.css`
- Dark mode via `next-themes` (class strategy)
- shadcn/ui "new-york" style preset

### TypeScript Path Aliases

- `@/*` - project root
- `@/app/components/*` - components
- `@/app/lib/*` - lib utilities
- `@/app/hooks/*` - custom hooks

## Environment Variables

```
NEXT_PUBLIC_SANITY_PROJECT_ID    # Sanity project ID
NEXT_PUBLIC_SANITY_DATASET       # Dataset (default: 'production')
SANITY_API_WRITE_TOKEN           # Write token for mutations
SANITY_WEBHOOK_SECRET            # Webhook validation secret
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID  # Google Analytics ID
```

## Sanity Integration Notes

- The Sanity Studio lives in a separate `jakeportfolio-studio` directory
- Schema changes must be synchronized between both projects
- Frontend queries in `sanity.client.ts` must match schema structure
- Use `useCdn: false` to avoid stale content issues
