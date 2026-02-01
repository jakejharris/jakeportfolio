/**
 * Site-wide configuration for SEO and metadata
 */

export const siteConfig = {
  name: "Jake Harris",
  title: "Jake Harris - Full Stack Developer",
  description: "Full Stack Developer building AI-powered web applications and digital experiences.",
  url: "https://jakejh.com",
  author: {
    name: "Jake Harris",
    email: "jake@jjhdigital.com",
    twitter: "@jakejharris",
    linkedin: "https://linkedin.com/in/jakejh",
    github: "https://github.com/jakejharris",
  },
  locale: "en_US",
} as const;

export type SiteConfig = typeof siteConfig;
