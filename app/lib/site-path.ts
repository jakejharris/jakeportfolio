import { SITE_URL } from './entity';

const HOST = new URL(SITE_URL).hostname;
/** The site's own hosts: the canonical one and its www alias. */
const SITE_HOSTS = new Set([HOST, `www.${HOST}`]);

/**
 * A link's path when it leads to a page on this site (a path, or an http(s) URL on the site's own host), else
 * null. A page on the site opens in place with the site's page change; a page elsewhere opens a new tab.
 */
export function sitePath(url: string): string | null {
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || !SITE_HOSTS.has(parsed.hostname)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
