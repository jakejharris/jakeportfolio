import "./globals.css";
import "./css/overscroll-fix.css";
import { geistSans, geistMono } from "./lib/fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
