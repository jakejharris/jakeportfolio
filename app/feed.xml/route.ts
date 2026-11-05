import { sanityFetch } from '@/app/lib/sanity.client';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://jakejh.com';

type FeedPost = {
  title: string;
  slug: { current: string };
  publishedAt: string;
  _updatedAt: string;
  excerpt?: string;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export async function GET() {
  const posts = await sanityFetch<FeedPost[]>({
    query: `*[_type == "post"] | order(publishedAt desc)[0...25] {
      title,
      slug,
      publishedAt,
      _updatedAt,
      excerpt
    }`,
    tags: ['post'],
  });

  const lastBuild = posts[0]
    ? new Date(posts[0]._updatedAt || posts[0].publishedAt).toUTCString()
    : new Date().toUTCString();

  const items = posts
    .map((post) => {
      const url = `${BASE_URL}/posts/${post.slug.current}/`;
      const description = post.excerpt
        ? `\n      <description>${escapeXml(post.excerpt)}</description>`
        : '';
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>${description}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Jake Harris, writing</title>
    <link>${BASE_URL}/posts/</link>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>AI integration, local inference, and product engineering from Jake Harris.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
}
