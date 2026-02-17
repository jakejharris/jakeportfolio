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
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL('https://jakejh.com'),
  title: {
    default: "Jake Harris - Full Stack Developer",
    template: "%s | Jake Harris"
  },
  description: "Jake Harris is a Full Stack Developer building AI-powered web applications, custom platforms, and digital experiences. Explore projects, insights, and more.",
  keywords: ["Jake Harris", "Full Stack Developer", "AI Developer", "Web Development", "React", "Next.js", "TypeScript"],
  authors: [{ name: "Jake Harris" }],
  creator: "Jake Harris",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://jakejh.com",
    siteName: "Jake Harris",
    title: "Jake Harris - Full Stack Developer",
    description: "Full Stack Developer building AI-powered web applications, custom platforms, and digital experiences.",
  },
  twitter: {
    card: "summary",
    site: '@jakeharrisdev',
    creator: '@jakeharrisdev',
    title: "Jake Harris - Full Stack Developer",
    description: "Full Stack Developer building AI-powered web applications, custom platforms, and digital experiences.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Jake Harris",
  "url": "https://jakejh.com",
  "description": "Jake Harris is a Full Stack Developer building AI-powered web applications, custom platforms, and digital experiences.",
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Jake Harris",
  "url": "https://jakejh.com",
  "jobTitle": "Full Stack Developer",
  "sameAs": [
    "https://github.com/jakejharris",
    "https://linkedin.com/in/jakejh",
    "https://x.com/jakeharrisdev",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable}`}>
      <head>
        <AccentScript />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([websiteSchema, personSchema]),
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans">
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
            <main className="flex-1">
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
