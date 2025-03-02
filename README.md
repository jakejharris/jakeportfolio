# Jake Harris - Portfolio & Blog

A modern, responsive portfolio website and blog built with Next.js, React, TypeScript, and Sanity CMS.

![Next.js](https://img.shields.io/badge/Next.js-15.1-black)
![React](https://img.shields.io/badge/React-19.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Sanity](https://img.shields.io/badge/Sanity-2.36-red)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan)

## 🚀 Features

- **Modern Tech Stack**: Built with Next.js 15, React 19, and TypeScript
- **Responsive Design**: Optimized for all device sizes
- **Dark/Light Mode**: Theme toggle with next-themes
- **Content Management**: Powered by Sanity CMS for easy content updates
- **Blog Platform**: Integrated blog with view counter and tag filtering
- **Fast Performance**: Optimized with Turbopack for quick development
- **Accessibility**: Built with best practices for web accessibility
- **Animations**: Smooth transitions and animations for better UX

## 🛠️ Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/jakeportfolio.git
   cd jakeportfolio
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root of the project with your Sanity credentials:
   ```
   NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
   NEXT_PUBLIC_SANITY_DATASET=production
   SANITY_API_TOKEN=your_api_token
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the site.

## 📝 Project Structure

- `app/` - Next.js 15 app router components and pages
- `app/components/` - Reusable UI components
- `app/posts/` - Blog post pages and components
- `app/about/` - About page
- `app/contact/` - Contact page
- `lib/` - Utility functions and shared code
- `sanity-schemas/` - Sanity CMS schema definitions
- `public/` - Static assets

## 🤝 Contributing

Feel free to fork this project, submit PRs, and report issues. Any contributions are welcome!

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

- Jake Harris - [GitHub](https://github.com/jakejharris) | [Website](https://jakejh.com)
