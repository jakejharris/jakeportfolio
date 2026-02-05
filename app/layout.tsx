import "./globals.css";
import "./css/overscroll-fix.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/sonner";
import { inter } from "./lib/fonts";
import { GoogleAnalytics } from '@next/third-parties/google'
import AccentScript from "./components/AccentScript";
import { TransitionProvider } from "./components/TransitionProvider";
import TransitionOverlay from "./components/TransitionOverlay";
import { PersonJsonLd, WebSiteJsonLd } from "./components/JsonLd";
import { siteConfig } from "./lib/site.config";
import SkipLink from "./components/SkipLink";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`
  },
  description: "Jake Harris is a Full Stack Developer building AI-powered web applications, custom platforms, and digital experiences. Explore projects, insights, and more.",
  keywords: ["Jake Harris", "Full Stack Developer", "AI Developer", "Web Development", "React", "Next.js", "TypeScript"],
  authors: [{ name: siteConfig.author.name }],
  creator: siteConfig.author.name,
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary",
    title: siteConfig.title,
    description: siteConfig.description,
    creator: siteConfig.author.twitter,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable}`}>
      <head>
        <AccentScript />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <PersonJsonLd />
        <WebSiteJsonLd />
      </head>
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <SkipLink />
        <Toaster />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TransitionProvider>
            <TransitionOverlay />
            <Navbar />
            <main id="main-content" tabIndex={-1} className="flex-1">
              {children}
              {process.env.NODE_ENV === 'production' && (
                <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID!} />
              )}
            </main>
            <Footer />
          </TransitionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
