// The one public origin. Vercel serves the site from www.jakejh.com and
// 308-redirects the apex there, so every canonical, OpenGraph, sitemap,
// robots and JSON-LD URL is built from this host and nothing points at a
// redirect.
export const SITE_URL = 'https://www.jakejh.com';

/** Absolute URL for a site path. Paths keep the trailing slash the app uses. */
export function absoluteUrl(path: string = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
