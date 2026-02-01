import { siteConfig } from '@/app/lib/site.config';

interface RssPost {
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt?: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  // Fetch all published posts from Sanity
  let posts: RssPost[] = [];

  try {
    const { client } = await import('@/app/lib/sanity.client');
    posts = await client.fetch<RssPost[]>(
      `*[_type == "post"] | order(publishedAt desc) {
        title,
        slug,
        publishedAt,
        excerpt
      }`
    );
  } catch (error) {
    console.warn('RSS Feed: Could not fetch posts from Sanity:', error);
  }

  const rssItems = posts
    .map((post) => {
      const postUrl = `${siteConfig.url}/posts/${post.slug.current}`;
      const pubDate = new Date(post.publishedAt).toUTCString();
      const description = post.excerpt || `Read ${post.title} by ${siteConfig.author.name}`;

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
      <author>${siteConfig.author.email} (${siteConfig.author.name})</author>
    </item>`;
    })
    .join('');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.title)}</title>
    <link>${siteConfig.url}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>${siteConfig.locale.replace('_', '-').toLowerCase()}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml"/>${rssItems}
  </channel>
</rss>`;

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
