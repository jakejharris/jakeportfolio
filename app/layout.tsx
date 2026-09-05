import "./globals.css";
import "./css/overscroll-fix.css";
import { geistSans, geistMono, sentient } from "./lib/fonts";
import ChromeIosInsetGuard from "./components/ChromeIosInsetGuard";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${sentient.variable}`}>
      <head>
        <ChromeIosInsetGuard />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
