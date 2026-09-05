# Jake Harris - Portfolio & Blog

A modern, responsive portfolio website and blog built with Next.js, React, TypeScript, and Sanity CMS.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black)
![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Sanity](https://img.shields.io/badge/Sanity-3-red)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan)

## 🚀 Features

- **Modern Tech Stack**: Built with Next.js 15, React 18, and TypeScript
- **Responsive Design**: Optimized for all device sizes
- **Dark/Light Mode**: Theme toggle with next-themes
- **Content Management**: Powered by Sanity CMS, with the Studio embedded at `/studio`
- **Blog Platform**: Integrated blog with view counter and tag filtering
- **Fast Performance**: Optimized with Turbopack for quick development
- **Accessibility**: Built with best practices for web accessibility
- **Animations**: Smooth transitions and animations for better UX

## 🛠️ Getting Started

### Prerequisites

- Node.js 22.x
- npm (the repo's `.npmrc` sets `legacy-peer-deps` and `include=dev`)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/jakeportfolio.git
   cd jakeportfolio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root of the project with your Sanity credentials:
   ```
   NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
   NEXT_PUBLIC_SANITY_DATASET=production
   NEXT_PUBLIC_SANITY_API_VERSION=2023-05-03
   ```
   See `CLAUDE.md` for the optional variables (webhook secret, write token, analytics).

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the site.

## 🧰 Scripts

```bash
npm run dev        # Development server (Turbopack)
npm run build      # Production build
npm run start      # Serve the production build
npm run lint       # ESLint 9 (flat config in eslint.config.mjs)
npm run typecheck  # tsc --noEmit
npm test           # Unit tests (node test runner via tsx)
```

`next build` ignores lint and type errors on purpose, so run `npm run lint` and `npm run typecheck` before opening a PR.

## 📝 Project Structure

- `app/` - Next.js 15 App Router
- `app/(site)/` - Public pages: home, `about/`, `contact/`, `posts/[slug]/`, `tags/[slug]/`, `jspark3/`
- `app/(studio)/` - Embedded Sanity Studio at `/studio`
- `app/api/` - Route handlers (revalidation webhook, view counts)
- `app/components/` - Site components (`ui/` holds the shadcn primitives in use)
- `app/lib/` - Sanity clients, fonts, view-count helpers
- `sanity-schemas/` - Sanity CMS schema definitions
- `scripts/` - Seed and social-image scripts
- `public/` - Static assets

## 🤝 Contributing

Feel free to fork this project, submit PRs, and report issues. Any contributions are welcome!

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

- Jake Harris - [GitHub](https://github.com/jakejharris) | [Website](https://jakejh.com)
