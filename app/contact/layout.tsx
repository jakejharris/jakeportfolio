import type { Metadata } from "next";
import { siteConfig } from "../lib/site.config";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Jake Harris for full stack development, AI integration, or consulting services. Connect via email or LinkedIn.",
  alternates: {
    canonical: `${siteConfig.url}/contact`,
  },
  openGraph: {
    title: `Contact | ${siteConfig.name}`,
    description: "Get in touch with Jake Harris for full stack development, AI integration, or consulting services.",
    url: `${siteConfig.url}/contact`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Contact | ${siteConfig.name}`,
    description: "Get in touch with Jake Harris for full stack development, AI integration, or consulting services.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
