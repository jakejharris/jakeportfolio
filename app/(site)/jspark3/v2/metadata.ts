import type { Metadata } from 'next';

export function projectMetadata(title: string, description: string, route: string): Metadata {
  const url = `https://jakejh.com${route}`;
  return {
    title, description, alternates: { canonical: url },
    openGraph: { title, description, type: 'website', url, images: [{ url: '/og/jspark3-tempo-sparks-v2.png', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/og/jspark3-tempo-sparks-v2.png'] },
  };
}
