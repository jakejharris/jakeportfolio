import "./globals.css";
import "./css/overscroll-fix.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/sonner";
import { inter } from "./lib/fonts";
import { GoogleAnalytics } from '@next/third-parties/google'

export const metadata = {
  title: "Jake Harris - Developer",
  description: "Portfolio and blog of Jake Harris",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <Toaster />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Navbar />
          <main className="flex-1">
            {children}
            {process.env.NODE_ENV === 'production' && (
              <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID!} />
            )}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
