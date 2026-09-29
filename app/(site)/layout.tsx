import PortfolioChrome from "../components/PortfolioChrome";
import Navbar from "../components/Navbar";
import AppearanceDock from "../components/AppearanceDock";
import { NavbarScrollProvider } from "../components/NavbarScrollContext";
import Footer from "../components/Footer";
import { ThemeProvider } from "../components/theme-provider";
import { Toaster } from "../components/ui/sonner";
import { GoogleAnalytics } from '@next/third-parties/google'
import AccentScript from "../components/AccentScript";
import { TransitionProvider } from "../components/TransitionProvider";
import TransitionOverlay from "../components/TransitionOverlay";
import type { Metadata } from "next";
import { ABOUT_URL, PERSON_DESCRIPTION, SHARE_IMAGE, SITE_URL, jsonLd, personNode, websiteNode } from "../lib/entity";

const title = "Jake Harris | ML Researcher";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: "%s | Jake Harris"
  },
  description: PERSON_DESCRIPTION,
  keywords: ["Jake Harris", "ML Researcher", "Machine learning", "LLM inference", "Agent systems"],
  authors: [{ name: "Jake Harris", url: ABOUT_URL }],
  creator: "Jake Harris",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/`,
    siteName: "Jake Harris",
    title,
    description: PERSON_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    site: '@jakeharrisdev',
    creator: '@jakeharrisdev',
    title,
    description: PERSON_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AccentScript />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(websiteNode, personNode) }}
      />
      <Toaster />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <TransitionProvider>
          <TransitionOverlay />
          <NavbarScrollProvider>
            <PortfolioChrome><Navbar /></PortfolioChrome>
            <PortfolioChrome><AppearanceDock /></PortfolioChrome>
            <main className="flex-1">
              {children}
              {process.env.NODE_ENV === 'production' && (
                <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID!} />
              )}
            </main>
            <PortfolioChrome><Footer /></PortfolioChrome>
          </NavbarScrollProvider>
        </TransitionProvider>
      </ThemeProvider>
    </>
  );
}
